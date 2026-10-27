/* CORRE · STUDIO (v3.38 → v3.40): programa o mês, o Corre posta. No jeito do mLabs: um calendário (mês, semana, lista)
   com o que tá programado e o que já foi publicado, de todas as marcas.
   v3.40: cada post diz EM QUAL CONTA sai. As contas são conectadas com o login de cada uma (igcontas.js); post com dia,
   hora, arte e conta sai sozinho na hora certa (o relógio do banco passa a fila de 5 em 5 minutos e a função
   "instagram" publica pela conta do post). Post sem conta vira lembrete: na hora, o "Postar" leva pro Instagram com a
   legenda copiada (no celular, a arte vai pelo compartilhar; no computador, baixa e abre o Instagram).
   O mês inteiro sai de uma vez (lote.js): a IA faz a pauta, as artes e as legendas, ou você sobe as tuas artes. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const DOW3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], DOWL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const MES = C.MESES_L;
  const SEL_K = 'corre-studio-marca', VISTA_K = 'corre-studio-vista';
  const ST = { el: null, com: [], sem: [], sel: 'todas', posts: [], vista: 'mes', mes: '', semana: 0, contas: null, contasErro: '', contasEm: 0, filaEm: 0, timer: 0, aberto: '', arq: null, migrou: false };

  /* ---------- datas (Brasília é UTC−3 o ano todo) ---------- */
  const hoje = () => C.hojeBR();
  const isoUTC = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const parts = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), ms: Date.UTC(y, m - 1, d) }; };
  const weekOf = iso => { const i = parts(iso); return i.ms - ((i.dow + 6) % 7) * DAY; };
  const quando = (data, hora) => { const [y, m, d] = data.split('-').map(Number), [h, mi] = (hora || '12:00').split(':').map(Number); return Date.UTC(y, m - 1, d, h + 3, mi); };
  const at = p => quando(p.data, p.hora);
  const igQuando = (data, hora) => `${data}T${hora || '12:00'}:00-03:00`;
  const curto = iso => { const i = parts(iso); return `${DOW3[i.dow]} ${pad(i.d)}/${pad(i.m)}`; };
  const longo = p => { if(!p.data) return 'Sem data'; const i = parts(p.data), w = DOWL[i.dow]; return `${w[0].toUpperCase() + w.slice(1)}, ${pad(i.d)}/${pad(i.m)}${p.hora ? ' · ' + p.hora : ''}`; };
  const mesNome = ym => { const [y, m] = ym.split('-').map(Number); return `${MES[m - 1][0].toUpperCase() + MES[m - 1].slice(1)} ${y}`; };

  /* ---------- o estado de cada post: programado, publicado, atrasado, erro ou rascunho ---------- */
  const EST = {
    prog: ['Programado', 'Sai sozinho no dia e na hora'], indo: ['Publicando', 'Indo pro Instagram agora'], pub: ['Publicado', 'Já tá no Instagram'],
    atras: ['Atrasado', 'Passou da hora e não foi pro Instagram'], erro: ['Deu erro', 'Não foi pro Instagram'], ideia: ['Rascunho', 'Falta dia, hora ou arte']
  };
  function estado(p){
    const ig = p.ig_status || '';
    if(ig === 'publicado' || p.status === 'postado') return 'pub';
    if(ig === 'publicando') return 'indo';
    if(ig === 'erro') return 'erro';
    if(!p.data || !p.hora || !p.midia_url || p.status === 'ideia') return 'ideia';
    const t = at(p);
    /* com a conta conectada, os primeiros minutos depois da hora são da fila (o relógio passa de 5 em 5) */
    if(t <= Date.now()) return ig === 'agendado' && contaDoPost(p) && t > Date.now() - 15 * 6e4 ? 'indo' : 'atras';
    return 'prog';
  }
  const pill = s => `<span class="sd-pill ${s}"><i></i>${EST[s][0]}</span>`;
  const marcaDe = p => ST.com.find(m => m.id === p.marca_id) || ST.sem.find(m => m.id === p.marca_id) || null;
  const visiveis = () => ST.posts.filter(p => ST.sel === 'todas' || p.marca_id === ST.sel);
  const ordena = L => L.slice().sort((a, b) => String(a.data || '9999').localeCompare(String(b.data || '9999')) || String(a.hora || '99').localeCompare(String(b.hora || '99')) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const doDia = iso => ordena(visiveis().filter(p => p.data === iso));
  const vivo = () => !!(ST.el && ST.el.isConnected && C.$('sd-corpo'));

  /* ---------- Instagram: as contas conectadas (o login de cada conta, igcontas.js) e a conta de cada post ---------- */
  /* v4.39: carrossel com mais de 10 não sai sozinho (a API do Instagram vai até 10): é sempre lembrete */
  const muitos = p => !!(C.soMao && C.soMao(p));
  const contaDoPost = p => { const c = p && p.ig_conta && C.ig && !muitos(p) ? C.ig.porId(p.ig_conta) : null; return c && C.ig.ok(c) ? c : null; };
  /* a marca tem conta conectada com o @ dela (é ela que vem marcada nos posts novos) */
  const ligada = m => !!(m && C.ig && C.ig.daMarca(m));
  async function contas(force){ if(C.ig) await C.ig.carrega(force); ST.contas = C.ig ? C.ig.contas() : []; ST.contasErro = ''; ST.contasEm = Date.now(); }
  const PUB_ERRO = {
    sem_conta: 'Esse post não tem conta do Instagram. Escolhe a conta no "Postar em".',
    conta_expirou: 'A conexão dessa conta venceu. Conecta de novo em Contas do Instagram.', conta_revogada: 'Essa conta tirou a permissão do Corre. Conecta de novo em Contas do Instagram.',
    sem_chave: 'A conexão dessa conta não vale mais. Conecta de novo em Contas do Instagram.',
    sem_permissao: 'A conta não deu a permissão de publicar. Conecta de novo e deixa "publicar" marcado.',
    ocupado: 'O Instagram pediu um tempo. Tenta daqui a pouco.', publicando: 'Esse post já tá indo pro Instagram.',
    sem_arte: 'Esse post não tem arte salva. Abre no editor e salva.', sem_rede: 'A marca não tem o @ do Instagram.',
    formato: 'O post tá incompleto pro formato (carrossel com 2 ou mais, reels com vídeo). Abre no Editar e completa.',
    login: 'Entra de novo pra publicar.', sem_funcao: 'A função do Instagram ainda não foi atualizada no Supabase.', fn: 'A função do Instagram ainda não foi atualizada no Supabase.'
  };
  const pubMsg = e => (e && (PUB_ERRO[e.code] || (e.status === 404 && PUB_ERRO.sem_funcao) || e.detalhe)) || 'Não deu pra publicar agora.';
  /* a linha das contas (em cima do calendário): em qual conta sai e o atalho pras contas */
  function autoLinha(){
    const mk = ST.com.find(x => x.id === ST.sel), L = C.ig ? C.ig.conectadas() : [], btn = `<button type="button" class="btn sm" data-act="ig-contas">${ico('ig')} Contas</button>`;
    if(ST.contas === null) return `<span class="sd-auto-k">${ico('ig')} Instagram</span><span>Vendo as contas conectadas…</span>`;
    /* v3.41: sem conta (nenhuma, vencida ou a última tentativa falhou), a linha é a mesma da porta do Studio Cria
       (igcontas.js): o estado e o motivo ficam aqui, não só no aviso que some */
    /* falha guardada ou conta vencida também mandam a linha pra lá, mesmo com outra conta conectada */
    if(!L.length || (C.ig && (C.ig.falhou() || C.ig.contas().some(c => !C.ig.ok(c))))) return C.ig ? C.ig.linha({ rede: mk ? mk.rede : '' }) : '';
    if(mk){ const c = C.ig.daMarca(mk); return c ? `<span class="sd-auto-k on">${C.ig.chip(c)}</span><span>Os posts da ${esc(mk.marca)} saem sozinhos no @${esc(c.username)}, no dia e na hora (dá pra trocar a conta em cada post).</span>${btn}`
      : `<span class="sd-auto-k">${ico('ig')} @${esc(mk.rede)} não conectada</span><span>Em cada post você escolhe em qual conta sai, ou conecta a @${esc(mk.rede)}.</span><button type="button" class="btn sm pri" data-act="ig-conectar" data-rede="${esc(mk.rede)}">Conectar @${esc(mk.rede)}</button>${btn}`; }
    return `<span class="sd-auto-k on">${L.slice(0, 3).map(c => C.ig.chip(c)).join('')}${L.length > 3 ? `<b>+${L.length - 3}</b>` : ''}</span><span>${L.length === 1 ? 'Conta conectada' : L.length + ' contas conectadas'}: cada post mostra em qual sai.</span>${btn}`;
  }

  /* ---------- dados ---------- */
  async function carregar(){
    const ids = new Set(ST.com.concat(ST.sem).map(m => m.id));
    const ps = await C.api.q('corre_posts', { eq: { dono: C.uid() }, order: ['data', true], limit: 2000 });
    ST.posts = ps.filter(p => ids.has(p.marca_id));
    migra();
  }
  /* o que entrou na agenda antes da v3.38 sem "programar" (dia, hora e arte, pra frente) passa a ser programado:
     no Studio Cria novo, tudo que tá no calendário sai sozinho */
  async function migra(){
    if(ST.migrou) return; ST.migrou = true;
    const L = ST.posts.filter(p => !p.ig_status && p.status === 'pronto' && p.data && p.hora && p.midia_url && at(p) > Date.now() + 6e4).slice(0, 60);
    for(const p of L){ try{ await C.api.upd('corre_posts', { id: p.id }, { ig_status: 'agendado', ig_quando: igQuando(p.data, p.hora) }); Object.assign(p, { ig_status: 'agendado', ig_quando: igQuando(p.data, p.hora) }); }catch(e){} }
    if(L.length && vivo()) corpo();
  }
  /* reforço do relógio do banco: post programado que já venceu, a função passa agora (só nas marcas ligadas) */
  async function fila(){
    const venc = x => x.ig_status === 'agendado' && Date.parse(x.ig_quando || igQuando(x.data, x.hora)) <= Date.now() && !!contaDoPost(x);
    if(!ST.posts.some(venc) || Date.now() - ST.filaEm < 9e4) return false;
    ST.filaEm = Date.now();
    if(C.DEMO){
      for(const p of ST.posts.filter(venc)){
        const c = contaDoPost(p); try{ await C.api.upd('corre_posts', { id: p.id }, { ig_status: 'publicado', status: 'postado', ig_erro: '', ig_link: c ? `https://www.instagram.com/${encodeURIComponent(c.username)}/` : '' }); }catch(e){}
      }
      return true;
    }
    try{ const r = await C.api.fn('instagram', { acao: 'fila' }); return !!(r && r.feitos); }catch(e){ return false; }
  }
  function relogio(){
    clearInterval(ST.timer);
    ST.timer = setInterval(async () => {
      if(!vivo()){ clearInterval(ST.timer); return; }
      const indo = ST.posts.some(p => p.ig_status === 'publicando');
      const logo = ST.posts.some(p => p.ig_status === 'agendado' && Date.parse(p.ig_quando || igQuando(p.data, p.hora)) <= Date.now() + 6e4);
      if(!indo && !logo){ corpo(); return; }
      if(logo) await fila();
      try{ await carregar(); }catch(e){ return; }
      if(vivo() && !(C.$('sheet') && !C.$('sheet').hidden)) corpo();
    }, 30000);
  }

  /* ---------- a tela ---------- */
  function mount(el, o){
    ST.el = el; ST.com = o.com || []; ST.sem = o.sem || []; ST.aberto = ''; ST.migrou = false; ST.hora = '';
    let guardada = ''; try{ guardada = localStorage.getItem(SEL_K) || ''; ST.vista = localStorage.getItem(VISTA_K) || 'mes'; }catch(e){}
    if(!['mes', 'semana', 'lista'].includes(ST.vista)) ST.vista = 'mes';
    const id = o.id || '';
    ST.sel = id === 'todas' ? 'todas' : ST.com.some(m => m.id === id) ? id : (!id && ST.com.some(m => m.id === guardada)) ? guardada : 'todas';
    if(id && id !== ST.sel) history.replaceState(null, '', '#/studio');
    ST.mes = hoje().slice(0, 7); ST.semana = weekOf(hoje());
    ST.contas = null;
    topo();
    /* v3.41: as contas carregam mesmo sem marca ligada, pra linha do Instagram dizer o estado */
    contas().then(() => { const l = C.$('sd-ig'); if(l) l.innerHTML = autoLinha(); if(C.ig) C.ig.selos(); if(vivo()) corpo(); });
    if(!ST.com.length) return;
    C.$('sd-corpo').innerHTML = '<p class="note">Abrindo a agenda…</p>';
    carregar().then(async () => {
      corpo();
      if(o.post) abreDoAviso(o.post);
      /* v4.33: o "Fala com o Corre" pediu um post (agenda post da GP Burger sexta 18h): o editor abre já começado */
      else if(C.fala && C.fala.pega){ const pd = C.fala.pega('post'); if(pd) daFala(pd); }
      if(await fila()){ try{ await carregar(); }catch(e){} corpo(); }
      relogio();
    }).catch(e => { const c = C.$('sd-corpo'); if(c) c.innerHTML = `<p class="note">${esc(C.errMsg(e, 'Não deu pra abrir os posts.'))}</p>`; });
    if(C.lote) C.lote.barra();
  }
  /* v4.18: veio do aviso "Hora de postar" (ou "Não saiu no Instagram"): a agenda vai pro mês e pra marca do post e o
     painel abre com a faixa da hora e o Postar aceso. O Postar é um toque da pessoa: o compartilhar do celular só sai
     no toque, então o aviso não posta sozinho */
  function abreDoAviso(id){
    const p = ST.posts.find(x => x.id === id);
    if(!p){ C.toast('Esse post não tá mais na agenda (foi apagado ou é de outra conta).', 4200); return; }
    if(ST.sel !== 'todas' && p.marca_id !== ST.sel && ST.com.some(m => m.id === p.marca_id)){
      ST.sel = p.marca_id; try{ localStorage.setItem(SEL_K, ST.sel); }catch(e){}
      topo(); corpo(); if(C.lote) C.lote.barra(); if(C.ig) C.ig.selos();
    }
    if(p.data){ ST.mes = p.data.slice(0, 7); ST.semana = weekOf(p.data); corpo(); }
    ST.hora = id;
    painel(id);
  }
  function topo(){
    const m = ST.com.find(x => x.id === ST.sel);
    /* v4.18: a bolinha no logo e o "no ar" / "desconectada" depois do @ (igcontas.js acerta quando as contas chegam) */
    const ig = C.ig && C.ig.selo;
    const chip = x => `<button type="button" role="tab" class="st-mk" data-act="sd-marca" data-id="${x.id}" aria-selected="${ST.sel === x.id}"><span class="st-mk-av">${C.marcaLogo(x, 's')}${ig ? C.ig.selo(x) : ''}</span><span><b>${esc(x.marca)}</b><small>@${esc(x.rede)}${ig ? C.ig.seloTx(x) : ''}</small></span></button>`;
    ST.el.innerHTML = `
      <section class="card st-top">
        <div class="st-h"><div><span class="mono">${ico('magia')} Studio Cria</span><h1>${m ? `O mês da <span class="hl">${esc(m.marca)}</span>` : ST.com.length ? 'Programa o mês. <span class="hl">O Corre posta.</span>' : 'Escolhe a marca e programa o mês'}</h1>
          <p class="note">Sobe as artes ou manda a IA fazer, escolhe os dias e pronto: ${C.ig && !C.ig.aberto() && !(C.ig.conectadas() || []).length ? 'cada post entra na agenda, e na hora o Corre te lembra de postar (a postagem automática no Instagram chega em breve).' : 'cada post sai sozinho no Instagram, no dia e na hora.'}</p></div>
          ${ST.com.length ? `<div class="st-ctas"><button type="button" class="btn pri st-novo" data-act="lt-mes">${ico('magia')} Mês com IA</button><button type="button" class="btn st-sub" data-act="lt-subir">${ico('up')} Subir artes</button><button type="button" class="btn ghost st-um" data-act="sd-novo">${ico('plus')} Um post</button>${C.aprova ? `<button type="button" class="btn ghost st-apr" data-act="ap-link"${m ? ` data-marca="${m.id}"` : ''}>${ico('check')} Link de aprovação</button>` : ''}</div>` : ''}</div>
        ${ST.com.length || ST.sem.length ? `<div class="st-marcas" role="tablist" aria-label="Marcas">
          ${ST.com.length > 1 ? `<button type="button" role="tab" class="st-mk todas" data-act="sd-marca" data-id="todas" aria-selected="${ST.sel === 'todas'}"><span class="sd-todas" aria-hidden="true">${ST.com.slice(0, 3).map(x => `<i style="--c:${esc(x.cor || '#FFE800')}"></i>`).join('')}</span><span><b>Todas</b><small>${ST.com.length} marcas${ig ? `<em class="mk-st-t on" data-mk-noar="${esc(ST.com.map(m => String(m.rede || '').toLowerCase()).join(','))}"></em>` : ''}</small></span></button>` : ''}
          ${ST.com.map(x => chip(x) + (x.id === ST.sel ? `<button type="button" class="st-mk-op" data-act="mk-op" data-id="${x.id}" aria-label="Editar ou remover a marca ${esc(x.marca)}" title="Editar ou remover a ${esc(x.marca)}">${ico('dots')}</button>` : '')).join('')}
          ${ST.sem.map(x => `<button type="button" class="st-mk off" data-act="mk-edit" data-id="${x.id}" title="Liga o Instagram dessa marca pra trampar nela no Studio Cria">${C.marcaLogo(x, 's')}<span><b>${esc(x.marca)}</b><small>ligar o Insta</small></span></button>`).join('')}
          <button type="button" class="st-mk add" data-act="mk-nova">${ico('plus')}<span><b>Nova marca</b><small>pra trampar</small></span></button>
        </div>` : ''}
        <p class="sd-ig sd-auto" id="sd-ig">${autoLinha()}</p>${ST.com.length && C.push ? C.push.faixa('studio') : ''}${ST.com.length ? `<div class="lt-barra" id="lt-barra" hidden></div>` : ''}
      </section>
      ${ST.com.length ? `<section class="card sd-cal" aria-label="Agenda">
        <div class="sd-bar">
          <div class="sd-vistas" role="tablist" aria-label="Ver por">${[['mes', 'Mês'], ['semana', 'Semana'], ['lista', 'Lista']].map(([k, n]) => `<button type="button" role="tab" data-act="sd-vista" data-v="${k}" aria-selected="${ST.vista === k}">${n}</button>`).join('')}</div>
          <div class="sd-nav"><button type="button" class="rnd" data-act="sd-ir" data-d="-1" aria-label="Anterior">${ico('prev')}</button><h2 id="sd-per"></h2><button type="button" class="rnd" data-act="sd-ir" data-d="1" aria-label="Próximo">${ico('next')}</button><button type="button" class="btn sm" data-act="sd-hoje">Hoje</button></div>
        </div>
        <div class="sd-nums" id="sd-nums"></div>
        <div id="sd-corpo"></div>
      </section>`
      : `<section class="card st-vazio"><p><b>${ST.sem.length ? 'Liga o Instagram de uma marca pra começar.' : 'Põe a primeira marca que você trampa.'}</b></p><p class="note">Com o @ da marca, o Studio Cria puxa as 9 últimas postagens dela como referência pra IA. Também dá pra subir fotos e prints do feed.</p>
        <div class="acts">${ST.sem.length ? `<button type="button" class="btn pri" data-act="mk-edit" data-id="${ST.sem[0].id}">Ligar o Instagram da ${esc(ST.sem[0].marca)}</button>` : `<button type="button" class="btn pri" data-act="mk-nova">${ico('plus')} Adicionar marca</button>`}</div></section>`}`;
  }
  function corpo(){
    if(!vivo()) return;
    const box = C.$('sd-corpo');
    let L, per;
    if(ST.vista === 'semana'){
      const a = isoUTC(ST.semana), b = isoUTC(ST.semana + 6 * DAY), pa = parts(a), pb = parts(b);
      per = `${pad(pa.d)}/${pad(pa.m)} a ${pad(pb.d)}/${pad(pb.m)}`;
      L = visiveis().filter(p => p.data && p.data >= a && p.data <= b);
      box.innerHTML = semana();
    }else{
      per = mesNome(ST.mes);
      L = visiveis().filter(p => p.data && p.data.startsWith(ST.mes));
      box.innerHTML = ST.vista === 'lista' ? lista() : mes();
    }
    C.$('sd-per').textContent = per;
    const c = { prog: 0, pub: 0, atras: 0, erro: 0, ideia: 0 };
    L.forEach(p => { const s = estado(p); if(s === 'indo') c.prog++; else c[s]++; });
    const rasc = visiveis().filter(p => !p.data).length;
    C.$('sd-nums').innerHTML = [['prog', c.prog, c.prog === 1 ? 'programado' : 'programados'], ['pub', c.pub, c.pub === 1 ? 'publicado' : 'publicados'], ['atras', c.atras, c.atras === 1 ? 'atrasado' : 'atrasados'], ['erro', c.erro, 'com erro'], ['ideia', c.ideia + rasc, c.ideia + rasc === 1 ? 'rascunho' : 'rascunhos']]
      .filter(([k, n]) => n || k === 'prog' || k === 'pub').map(([k, n, t]) => `<span class="sd-n ${k}"><b class="num">${n}</b> ${t}</span>`).join('')
      + (!L.length && !rasc ? `<span class="sd-n-dica">Mês vazio: o <b>Mês com IA</b> monta e programa ele inteiro.</span>` : '');
  }
  /* v4.17: o formato (carrossel, story, reels) e a resposta do cliente no link de aprovação aparecem nos cartões */
  const ES = () => C.estudio || {};
  const tags = p => (ES().fmtTag ? ES().fmtTag(p) : '') + (ES().aprovTag ? ES().aprovTag(p) : '');
  const fmtDe = p => (p && p.formato) || 'feed';
  const thumb = p => p.midia_url ? `<img src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async">${tags(p)}` : `<span class="sd-noart">${ico('img')}</span>`;
  const rot = p => { const m = marcaDe(p); return `${p.hora || 'sem hora'}${m ? ' · ' + m.marca : ''}: ${p.titulo || 'post'} (${EST[estado(p)][0]})`; };
  const mao = (p, s) => (s === 'prog' && !contaDoPost(p)) ? ' mao' : '';
  const chipMes = p => { const m = marcaDe(p), s = estado(p); return `<button type="button" class="sd-ch ${s}${mao(p, s)}" data-act="sd-post" data-id="${p.id}" style="--c:${esc((m && m.cor) || '#FFE800')}" aria-label="${esc(rot(p))}">${p.midia_url ? `<img class="mini" src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async">` : '<i class="cor"></i>'}${p.aprov ? `<i class="apr-pt ${p.aprov === 'aprovado' ? 'ok' : 'aj'}" title="${p.aprov === 'aprovado' ? 'Aprovado pelo cliente' : 'O cliente pediu ajuste'}"></i>` : ''}<span class="t num">${esc(p.hora || '··:··')}</span><span class="tt">${esc(p.titulo || (m && m.marca) || 'Post')}</span><i class="st" aria-hidden="true"></i></button>`; };
  function mes(){
    const [y, m] = ST.mes.split('-').map(Number), t = hoje();
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), off = (first + 6) % 7, days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<span class="wd" aria-hidden="true">${d}</span>`);
    for(let k = 0; k < off; k++) cells.push('<span class="sd-dia blank" aria-hidden="true"></span>');
    for(let d = 1; d <= days; d++){
      const iso = `${y}-${pad(m)}-${pad(d)}`, ps = doDia(iso), isT = iso === t, past = iso < t;
      cells.push(`<div class="sd-dia${isT ? ' hoje' : ''}${past ? ' past' : ''}${ps.length ? ' tem' : ''}">
        <button type="button" class="n num" data-act="sd-dia" data-dia="${iso}" aria-label="${d} de ${MES[m - 1]}: ${ps.length ? ps.length + (ps.length === 1 ? ' post' : ' posts') : 'nenhum post'}${past ? '' : ', criar post'}">${d}</button>
        ${ps.slice(0, 3).map(chipMes).join('')}${ps.length > 3 ? `<button type="button" class="sd-mais num" data-act="sd-dia" data-dia="${iso}">+${ps.length - 3}</button>` : ''}
        ${!past ? `<button type="button" class="sd-add" data-act="sd-novo" data-dia="${iso}" aria-label="Novo post em ${d} de ${MES[m - 1]}">${ico('plus')}</button>` : ''}
      </div>`);
    }
    while((cells.length - 7) % 7) cells.push('<span class="sd-dia blank" aria-hidden="true"></span>');
    const mk = ST.com.find(x => x.id === ST.sel);
    let grade = '';
    if(mk){
      const fim = `${ST.mes}-${pad(days)}`, G = ordena(visiveis().filter(p => p.data && p.data <= fim && p.status !== 'ideia' && p.midia_url && fmtDe(p) !== 'story')).reverse().slice(0, 9);
      grade = `<aside class="sd-grade"><h3 class="mono">Como o perfil fica</h3>${G.length ? `<div class="sd-g3">${G.map(p => `<button type="button" data-act="sd-post" data-id="${p.id}" class="${estado(p) === 'pub' ? 'pub' : ''}" aria-label="${esc(p.titulo || 'post')}"><img src="${esc(p.midia_url)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div><p class="note">@${esc(mk.rede)} no fim de ${MES[m - 1]}: o mais novo no canto de cima.</p>` : '<p class="note">Os posts com arte aparecem aqui na ordem em que entram no feed.</p>'}</aside>`;
    }
    return `<div class="sd-mes${grade ? ' com-grade' : ''}"><div class="sd-grid">${cells.join('')}</div>${grade}</div>${legenda()}`;
  }
  const legenda = () => `<div class="sd-leg" aria-label="Legenda">${['prog', 'pub', 'atras', 'erro', 'ideia'].map(pill).join('')}</div>`;
  function semana(){
    const t = hoje(), cols = [];
    for(let k = 0; k < 7; k++){
      const iso = isoUTC(ST.semana + k * DAY), i = parts(iso), ps = doDia(iso), past = iso < t;
      cols.push(`<div class="sd-col${iso === t ? ' hoje' : ''}${past ? ' past' : ''}"><h3><span>${iso === t ? 'hoje' : DOW3[i.dow]}</span><b class="num">${pad(i.d)}/${pad(i.m)}</b></h3>
        ${ps.map(card).join('')}
        ${!past ? `<button type="button" class="sd-add-l" data-act="sd-novo" data-dia="${iso}">${ico('plus')} post</button>` : ps.length ? '' : '<span class="sd-vz">—</span>'}
      </div>`);
    }
    return `<div class="sd-sem">${cols.join('')}</div>${legenda()}`;
  }
  function card(p){
    const m = marcaDe(p), s = estado(p);
    return `<button type="button" class="sd-card ${s}${mao(p, s)}" data-act="sd-post" data-id="${p.id}" style="--c:${esc((m && m.cor) || '#FFE800')}" aria-label="${esc(rot(p))}">
      <span class="sd-th">${thumb(p)}</span>
      <span class="sd-cx"><span class="sd-mk">${m ? C.marcaLogo(m, 's') : ''}<b>${esc(m ? m.marca : 'Marca')}</b></span><b class="num sd-hr">${esc(p.hora || 'sem hora')}</b><span class="sd-tt">${esc(p.titulo || 'Sem título')}</span>${pill(s)}</span>
    </button>`;
  }
  function lista(){
    const ps = ordena(visiveis().filter(p => p.data && p.data.startsWith(ST.mes))), rasc = ordena(visiveis().filter(p => !p.data));
    const dias = [...new Set(ps.map(p => p.data))], t = hoje();
    const linha = p => { const m = marcaDe(p), s = estado(p), c = p.ig_conta && C.ig ? C.ig.porId(p.ig_conta) : null; return `<li><button type="button" class="sd-li ${s}${mao(p, s)}" data-act="sd-post" data-id="${p.id}" style="--c:${esc((m && m.cor) || '#FFE800')}">
      <span class="sd-th">${thumb(p)}</span><b class="num sd-hr">${esc(p.hora || '—')}</b>
      <span class="sd-cx"><span class="sd-mk">${m ? C.marcaLogo(m, 's') : ''}<b>${esc(m ? m.marca : 'Marca')}</b>${c ? `<small class="sd-em">em @${esc(c.username)}</small>` : s === 'prog' || s === 'atras' ? '<small class="sd-em mao">sem conta: à mão</small>' : ''}</span><span class="sd-tt">${esc(p.titulo || 'Sem título')}</span>${p.legenda ? `<span class="sd-lg">${esc(p.legenda.slice(0, 140))}</span>` : ''}</span>
      ${pill(s)}</button></li>`; };
    return (dias.length ? dias.map(d => `<section class="sd-ld${d === t ? ' hoje' : ''}${d < t ? ' past' : ''}"><h3>${d === t ? 'Hoje · ' : ''}${esc(longo({ data: d }))}</h3><ol class="sd-lista">${ps.filter(p => p.data === d).map(linha).join('')}</ol></section>`).join('')
      : `<div class="sd-vazio"><p><b>Nada em ${MES[+ST.mes.slice(5) - 1]}.</b></p><p class="note">O jeito mais rápido: a IA faz a pauta, as artes e as legendas do mês, e você programa tudo de uma vez.</p><div class="acts"><button type="button" class="btn pri" data-act="lt-mes">${ico('magia')} Mês com IA</button><button type="button" class="btn" data-act="lt-subir">${ico('up')} Subir artes</button></div></div>`)
      + (rasc.length ? `<section class="sd-ld"><h3>Rascunhos sem data</h3><ol class="sd-lista">${rasc.map(linha).join('')}</ol></section>` : '');
  }

  /* ---------- o painel do post ---------- */
  function linhaEstado(p, s, m, conta){
    const hr = p.hora || '';
    if(s === 'prog' && muitos(p)) return `Programado como <b>lembrete</b>: carrossel com mais de 10, e o Instagram só deixa o Corre postar sozinho até 10. Na hora, o Corre te avisa: toca em <b>Postar</b> e escolhe os ${p.midias.length} no Instagram (a legenda vai copiada).`;
    if(s === 'prog') return conta ? `Sai sozinho no <b>@${esc(conta.username)}</b>, ${esc(longo(p).toLowerCase())}.${C.DEMO ? ' (Demonstração: não vai pro Instagram de verdade.)' : ''}` : `Programado como <b>lembrete</b>: sem conta escolhida, não sai sozinho. Na hora, toca em <b>Postar</b> (a legenda vai copiada), ou escolhe a conta aqui embaixo.`;
    if(s === 'atras') return `Passou da hora${hr ? ` (${esc(hr)})` : ''} e não foi pro Instagram. Posta agora: a legenda vai copiada.`;
    if(s === 'indo') return 'Indo pro Instagram agora.';
    if(s === 'pub') return p.ig_status === 'publicado' ? 'Publicado pelo Corre.' : 'Publicado (marcado à mão).';
    if(s === 'erro') return 'Não foi pro Instagram. Dá pra postar agora, no manual.';
    return !p.midia_url ? 'Rascunho: falta a arte. Abre no Editar e cria (ou sobe) a arte.' : !p.data || !p.hora ? 'Rascunho: falta o dia e a hora.' : 'Rascunho: fora da agenda.';
  }
  function painel(id){
    const p = ST.posts.find(x => x.id === id); if(!p) return;
    ST.aberto = id;
    const m = marcaDe(p), s = estado(p), conta = contaDoPost(p), pode = !!conta, fim = s === 'pub' || s === 'indo', foi = p.ig_conta && C.ig ? C.ig.porId(p.ig_conta) : null;
    const amanha = isoUTC(Date.now() - 3 * 36e5 + DAY), dDef = p.data && p.data >= hoje() ? p.data : amanha, hDef = p.hora || '18:00';
    C.sheet(`<div class="form sd-pp"><div class="sheet-head"><h2>${m ? C.marcaLogo(m, 's') : ''}<span>${esc(m ? m.marca : 'Post')}</span></h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="sd-pp-cols">
        <figure class="sd-pp-art f-${fmtDe(p)}">${(ES().midiaHTML && ES().midiaHTML(p, 'sd')) || (p.midia_url ? `<img src="${esc(p.midia_url)}" alt="${esc(p.alt || p.titulo || '')}">` : `<span class="sd-noart">${ico('img')}<b>Sem arte ainda</b></span>`)}</figure>
        <div class="sd-pp-tx">
          ${ST.hora === id && !fim ? horaFaixa(p, s) : ''}
          <div class="sd-pp-q">${pill(s)}<b class="num">${esc(longo(p))}</b>${fim && foi ? C.ig.chip(foi) : ''}${tags(p)}</div>
          ${p.aprov === 'ajuste' ? `<p class="apr-nota"><b>${esc(p.aprov_quem || 'O cliente')} pediu ajuste:</b> ${esc(p.aprov_nota || '')}</p>` : p.aprov === 'aprovado' ? `<p class="apr-nota ok"><b>Aprovado</b>${p.aprov_quem ? ` por ${esc(p.aprov_quem)}` : ''}${p.aprov_em ? ` em ${esc(curto(String(p.aprov_em).slice(0, 10)))}` : ''}.</p>` : p.aprov_nota ? `<p class="apr-nota velha"><b>Ajuste pedido antes:</b> ${esc(p.aprov_nota)}</p>` : ''}
          <p class="fine">${linhaEstado(p, s, m, conta)}</p>
          ${!fim && C.ig && !muitos(p) ? `<div class="sd-pp-conta">${C.ig.seletor('sd-pc', p.ig_conta || '', m)}</div>` : ''}
          ${s === 'erro' && p.ig_erro ? `<p class="sd-pp-erro">${esc(p.ig_erro)}</p>` : ''}
          <h3 class="sd-pp-t">${esc(p.titulo || 'Sem título')}</h3>
          <div class="sd-pp-leg">${p.legenda ? esc(p.legenda).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, '$1<span class="h">$2</span>') : '<span class="note">Sem legenda ainda. No Editar, a IA escreve olhando a arte.</span>'}</div>
          <div class="sd-pp-prog" id="sd-pp-prog" hidden>
            <div class="row2"><div class="fld"><label for="sd-pd">Dia</label><input class="inp" id="sd-pd" type="date" min="${hoje()}" value="${dDef}"></div><div class="fld"><label for="sd-ph">Hora</label><input class="inp" id="sd-ph" type="time" value="${hDef}"></div></div>
            <div class="acts"><button type="button" class="btn pri" data-act="sd-prog-ok" data-id="${p.id}">${ico('clock')} Programar</button><button type="button" class="btn ghost" data-act="sd-prog-x">Voltar</button></div>
            <p class="fine">${conta ? `Sai no @${esc(conta.username)} nessa hora (horário de Brasília), com essa arte e essa legenda.` : muitos(p) ? 'Carrossel com mais de 10: vira lembrete pra postar pelo celular nessa hora (horário de Brasília). O Instagram só deixa postar sozinho até 10.' : 'Sem conta escolhida: vira lembrete pra postar à mão nessa hora (horário de Brasília).'}</p>
          </div>
          <div class="sd-pp-acts" id="sd-pp-acts">
            <div class="acts">
              ${fim ? (p.ig_link ? `<a class="btn pri" href="${esc(p.ig_link)}" target="_blank" rel="noopener">${ico('ig')} Ver no Instagram</a>` : s === 'indo' ? `<button type="button" class="btn" data-act="sd-atualiza" data-id="${p.id}">Atualizar</button>` : '')
                : `<button type="button" class="btn pri" data-act="sd-manual" data-id="${p.id}"${p.midia_url ? '' : ' disabled'}>${ico('ig')} Postar</button>
                  ${pode && p.midia_url ? `<button type="button" class="btn" data-act="sd-publicar" data-id="${p.id}">${ico('send')} Publicar direto</button>` : ''}
                  <button type="button" class="btn" data-act="sd-prog"${p.midia_url ? '' : ' disabled'}>${ico('clock')} ${s === 'prog' ? 'Mudar dia e hora' : 'Programar'}</button>`}
              <button type="button" class="btn" data-act="sd-editar" data-id="${p.id}">${ico('edit')} Editar</button>
            </div>
            <div class="sd-pp-mais">
              <button type="button" class="btn sm" data-act="sd-copiar" data-id="${p.id}"${p.legenda ? '' : ' disabled'}>${ico('copy')} Copiar legenda</button>
              <button type="button" class="btn sm" data-act="sd-baixar" data-id="${p.id}"${p.midia_url ? '' : ' disabled'}>${ico('down')} ${fmtDe(p) === 'feed' ? 'Baixar arte' : 'Baixar'}</button>
              ${s !== 'indo' ? `<button type="button" class="btn sm${s === 'pub' && p.status === 'postado' ? ' on' : ''}" data-act="sd-feito" data-id="${p.id}" aria-pressed="${s === 'pub'}"${s === 'pub' && p.ig_status === 'publicado' ? ' hidden' : ''}>${ico('check')} ${s === 'pub' ? 'Publicado à mão' : 'Já postei'}</button>` : ''}
              ${s === 'prog' || s === 'atras' ? `<button type="button" class="btn sm ghost" data-act="sd-cancelar" data-id="${p.id}">Tirar da agenda</button>` : ''}
            </div>
          </div>
          <ol class="sd-pp-guia" id="sd-pp-guia" hidden></ol>
        </div>
      </div></div>`, 'wide');
    /* trocar a conta do post: grava na hora */
    const sel = C.$('sd-pc');
    if(sel) sel.addEventListener('change', async () => {
      const v = sel.value || null, c = v && C.ig ? C.ig.porId(v) : null;
      sel.disabled = true;
      try{ await C.api.upd('corre_posts', { id: p.id }, { ig_conta: v }); await depois(p.id, c ? `Agora sai em @${c.username}.` : 'Sem conta: vira lembrete pra postar à mão.'); }
      catch(e){ sel.disabled = false; C.toast(C.errMsg(e, 'Não deu pra trocar a conta agora.')); }
    });
    /* v4.18: aberto pelo aviso, o Postar acende e já fica no foco */
    const bp = ST.hora === id && !fim && document.querySelector('#sd-pp-acts [data-act="sd-manual"]');
    /* (o foco vem depois do da folha, que vai pro primeiro botão 30 ms depois de abrir) */
    if(bp && !bp.disabled){ bp.classList.add('pulsa'); setTimeout(() => { if(bp.isConnected) bp.focus({ preventScroll: true }); }, 120); }
    /* a arte já desce aqui: no celular, o "Postar" manda ela pelo compartilhar sem esperar */
    ST.arq = null;
    if(p.midia_url) fetch(p.midia_url).then(r => r.ok ? r.blob() : null).then(b => { if(b && ST.aberto === id) ST.arq = { id, file: new File([b], nomeArte(p), { type: b.type || 'image/jpeg' }) }; }).catch(() => {});
  }
  /* a faixa de quem chegou pelo aviso: o que fazer agora, em uma linha */
  function horaFaixa(p, s){
    const f = fmtDe(p), vai = f === 'feed' ? 'a legenda vai copiada e a arte vai pro Instagram' : f === 'story' ? 'o story vai pro compartilhar do celular' : 'os arquivos vão pro compartilhar e a legenda vai copiada';
    return s === 'erro'
      ? `<p class="sd-hora erro">${ico('ig')}<span><b>O Instagram recusou esse post.</b> Posta à mão: toca em Postar (${vai}).</span></p>`
      : `<p class="sd-hora">${ico('clock')}<span><b>Hora de postar.</b> Toca em Postar: ${vai}. Depois, Já postei.</span></p>`;
  }
  const nomeArte = p => { const m = marcaDe(p); return `${C.norm(m ? m.marca : 'post').replace(/[^a-z0-9]+/g, '-')}-${p.data || 'post'}.jpg`; };
  async function depois(id, msg){
    try{ await carregar(); }catch(e){}
    corpo(); if(msg) C.toast(msg, 4200);
    if(id && ST.aberto === id && C.$('sheet') && !C.$('sheet').hidden) painel(id);
  }
  /* v4.33: a marca que a pessoa falou; sem marca dita (ou que não bate), a escolha de sempre, com o post começado junto */
  function daFala(pd){
    const m = ST.com.find(x => x.id === pd.marca_id);
    if(m) return abrirEditor(m, null, pd.dia || undefined, pd);
    ST.pre = pd; novo(pd.dia || undefined);
  }
  function novo(dia){
    const m = ST.com.find(x => x.id === ST.sel) || (ST.com.length === 1 ? ST.com[0] : null);
    if(m){ const pre = ST.pre; ST.pre = null; return abrirEditor(m, null, dia, pre); }
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Post pra qual marca?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="sd-qual">${ST.com.map(x => `<button type="button" class="st-mk" data-act="sd-novo-mk" data-id="${x.id}" data-dia="${esc(dia || '')}">${C.marcaLogo(x, 's')}<span><b>${esc(x.marca)}</b><small>@${esc(x.rede)}${ligada(x) ? ' · conectada' : ''}</small></span></button>`).join('')}</div></div>`);
  }
  function abrirEditor(m, p, dia, pre){
    if(!C.estudio || !C.estudio.abrir) return;
    C.closeSheet();
    C.estudio.abrir(m, p, dia, { auto: true, studio: true, pre: pre || null, formato: pre && pre.formato, onSave: q => { if(q && q.data){ ST.mes = q.data.slice(0, 7); ST.semana = weekOf(q.data); } depois(null, ''); } });
  }
  /* "Postar": a legenda vai copiada e a arte vai pro Instagram. No celular, pelo compartilhar (escolhe o Instagram);
     no computador, a arte baixa e o Instagram abre numa aba (+ Criar, escolhe a arte e cola a legenda) */
  async function postar(p){
    if(fmtDe(p) !== 'feed' && ES().entregar){ const m = marcaDe(p); return ES().entregar(p, { marca: m && m.marca, depois: () => depois(p.id) }); }
    const leg = p.legenda || '';
    try{ if(leg && navigator.clipboard) navigator.clipboard.writeText(leg).catch(() => {}); }catch(e){}
    /* com a postagem automática ligada, quem posta à mão tira o post da fila (senão ele sai duas vezes). O banco é
       chamado sem esperar: o compartilhar do celular precisa sair ainda no toque */
    const tira = p.ig_status === 'agendado' && contaDoPost(p) ? C.api.upd('corre_posts', { id: p.id }, { ig_status: '', status: 'postado' }).then(() => { Object.assign(p, { ig_status: '', status: 'postado' }); return true; }).catch(() => false) : null;
    const f = ST.arq && ST.arq.id === p.id ? ST.arq.file : null, toque = matchMedia('(pointer:coarse)').matches;
    if(f && toque && navigator.canShare && navigator.share){
      let pode = false; try{ pode = navigator.canShare({ files: [f] }); }catch(e){}
      if(pode){
        try{ await navigator.share({ files: [f], title: p.titulo || '' }); guia(p, true, false, tira && await tira); return; }
        catch(e){ if(e && e.name === 'AbortError'){ if(tira && await tira) return depois(p.id, 'Ficou como publicado à mão (saiu da postagem automática). Não postou? Toca em Publicado à mão.'); C.toast(leg ? 'Legenda copiada. Quando quiser, toca em Postar de novo.' : 'Tudo bem, fica pra depois.'); return; } }
      }
    }
    window.open('https://www.instagram.com/', '_blank', 'noopener');
    const ok = await baixar(p);
    guia(p, false, ok, tira && await tira);
  }
  /* o passo a passo depois do Postar */
  function guia(p, compartilhou, baixou, tirou){
    const g = C.$('sd-pp-guia'), leg = !!p.legenda;
    const fim = tirou ? 'Saiu da postagem automática e ficou como publicado à mão. Não postou? Toca em Publicado à mão.' : 'Postou? Toca em Já postei.';
    const passos = compartilhou
      ? [leg ? 'Legenda copiada.' : 'Esse post tá sem legenda.', 'No Instagram, escolhe Feed (ou Story).', leg ? 'Na legenda, segura e cola.' : '', fim]
      : [leg ? 'Legenda copiada.' : 'Esse post tá sem legenda.', baixou ? 'Arte baixada.' : 'A arte abriu numa aba: salva ela.', 'No Instagram, + Criar e escolhe a arte.', leg ? 'Na legenda, cola (Ctrl+V ou ⌘V).' : '', fim];
    if(g){ g.innerHTML = passos.filter(Boolean).map((t, i) => `<li${i < (compartilhou ? 1 : 2) ? ' class="ok"' : ''}>${esc(t)}</li>`).join(''); g.hidden = false; }
    const f = document.querySelector('#sd-pp-acts [data-act="sd-feito"]');
    if(f && tirou){ f.classList.add('on'); f.setAttribute('aria-pressed', 'true'); f.innerHTML = `${ico('check')} Publicado à mão`; corpo(); }
    /* saiu da fila: o selo do painel vira publicado e o "Tirar da agenda" some */
    if(tirou){ const q = document.querySelector('.sd-pp-q .sd-pill'); if(q) q.outerHTML = pill(estado(p)); const c = document.querySelector('#sd-pp-acts [data-act="sd-cancelar"]'); if(c) c.remove(); }
    if(f){ f.classList.add('pulsa'); f.focus({ preventScroll: true }); }
    C.toast(leg ? 'Legenda copiada: no Instagram, é só colar.' : 'Arte pronta pro Instagram.', 4200);
  }

  Object.assign(C.acts, {
    'sd-marca': el => {
      ST.sel = el.dataset.id; try{ localStorage.setItem(SEL_K, ST.sel); }catch(e){}
      history.replaceState(null, '', ST.sel === 'todas' ? '#/studio' : '#/studio/' + ST.sel);
      const y = scrollY; topo(); scrollTo(0, y); corpo(); if(C.ig) C.ig.selos();
      const l = C.$('sd-ig'); if(l) l.innerHTML = autoLinha();
      if(C.lote) C.lote.barra();
    },
    'sd-vista': el => { ST.vista = el.dataset.v; try{ localStorage.setItem(VISTA_K, ST.vista); }catch(e){} document.querySelectorAll('[data-act="sd-vista"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === ST.vista))); corpo(); },
    'sd-ir': el => {
      const d = Number(el.dataset.d);
      if(ST.vista === 'semana') ST.semana += d * 7 * DAY;
      else { const [y, m] = ST.mes.split('-').map(Number), x = new Date(Date.UTC(y, m - 1 + d, 1)); ST.mes = `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}`; }
      corpo();
    },
    'sd-hoje': () => { ST.mes = hoje().slice(0, 7); ST.semana = weekOf(hoje()); corpo(); },
    'sd-contas': () => { if(C.ig) C.ig.sheet(); },
    'sd-novo': el => novo(el && el.dataset && el.dataset.dia),
    'sd-novo-mk': el => { const m = ST.com.find(x => x.id === el.dataset.id); const pre = ST.pre; ST.pre = null; if(m) abrirEditor(m, null, el.dataset.dia || undefined, pre); },
    'sd-dia': el => {
      const iso = el.dataset.dia, ps = doDia(iso), past = iso < hoje();
      if(!ps.length){ if(!past) novo(iso); return; }
      if(ps.length === 1 && past) return painel(ps[0].id);
      C.sheet(`<div class="form"><div class="sheet-head"><h2>${esc(longo({ data: iso }))}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="sd-dia-l">${ps.map(card).join('')}</div>
        ${past ? '' : `<div class="acts"><button type="button" class="btn pri" data-act="sd-novo" data-dia="${iso}">${ico('plus')} Novo post nesse dia</button></div>`}</div>`);
    },
    'sd-post': el => painel(el.dataset.id),
    'sd-editar': el => { const p = ST.posts.find(x => x.id === el.dataset.id), m = p && marcaDe(p); if(p && m) abrirEditor(m, p); },
    'sd-copiar': el => { const p = ST.posts.find(x => x.id === el.dataset.id); if(p && p.legenda) C.copy(p.legenda, 'Legenda copiada.'); },
    'sd-baixar': async el => { const p = ST.posts.find(x => x.id === el.dataset.id); if(!p) return; if(fmtDe(p) !== 'feed' && ES().entregar){ const m = marcaDe(p); return ES().entregar(p, { marca: m && m.marca, depois: () => depois(p.id) }); } await baixar(p); },
    'sd-atualiza': el => depois(el.dataset.id),
    'sd-prog': () => { const f = C.$('sd-pp-prog'), a = C.$('sd-pp-acts'); if(f){ f.hidden = false; a.hidden = true; C.$('sd-ph').focus(); } },
    'sd-prog-x': () => { const f = C.$('sd-pp-prog'), a = C.$('sd-pp-acts'); if(f){ f.hidden = true; a.hidden = false; } },
    'sd-prog-ok': async el => {
      const p = ST.posts.find(x => x.id === el.dataset.id); if(!p) return;
      const data = C.$('sd-pd').value, hora = C.$('sd-ph').value;
      if(!data || !hora){ C.toast('Escolhe o dia e a hora.'); return; }
      if(quando(data, hora) < Date.now() + 6e4){ C.toast('Essa hora já passou. Escolhe uma mais pra frente, ou toca em Postar pra postar agora.', 4200); return; }
      el.disabled = true;
      try{
        await C.api.upd('corre_posts', { id: p.id }, { data, hora, status: 'pronto', ig_status: 'agendado', ig_quando: igQuando(data, hora), ig_erro: '' });
        if(data.slice(0, 7) !== ST.mes){ ST.mes = data.slice(0, 7); }
        ST.semana = weekOf(data);
        /* v4.29: post programado é trampo (o banco confere) */
        if(C.trampo) C.trampo.ganha('post', p.id);
        await depois(p.id, `Programado: ${curto(data)} às ${hora}.`);
      }catch(e){ el.disabled = false; C.toast(C.errMsg(e, 'Não deu pra programar agora.')); }
    },
    'sd-cancelar': async el => {
      const p = ST.posts.find(x => x.id === el.dataset.id); if(!p) return;
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Tirar mesmo?'; return; }
      try{ await C.api.upd('corre_posts', { id: p.id }, { ig_status: '', status: 'ideia' }); await depois(p.id, 'Saiu da agenda: virou rascunho. O post continua aqui.'); }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra tirar agora.')); }
    },
    'sd-publicar': async el => {
      const p = ST.posts.find(x => x.id === el.dataset.id), c = p && contaDoPost(p); if(!p) return;
      if(!p.midia_url){ C.toast(PUB_ERRO.sem_arte); return; }
      if(!c){ C.toast(PUB_ERRO.sem_conta, 4200); return; }
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('send')} Publicar no @${esc(c.username)}?`; return; }
      el.disabled = true; el.innerHTML = 'Publicando…';
      if(C.DEMO){
        await new Promise(r => setTimeout(r, 900));
        try{ await C.api.upd('corre_posts', { id: p.id }, { ig_status: 'publicado', status: 'postado', ig_erro: '', ig_link: `https://www.instagram.com/${encodeURIComponent(c.username)}/` }); }catch(e){}
        return depois(p.id, 'Na demonstração o post fica como publicado, mas não vai pro Instagram de verdade.');
      }
      try{ const r = await C.api.fn('instagram', { acao: 'publicar', post_id: p.id }); if(C.trampo) C.trampo.ganha('post', p.id); await depois(p.id, r && r.ja ? 'Esse já tava no Instagram.' : r && r.processando ? 'O Instagram tá processando o vídeo. Sai sozinho em alguns minutos.' : 'Publicado no Instagram.'); }
      catch(e){ await depois(p.id, pubMsg(e)); }
    },
    'sd-manual': async el => { const p = ST.posts.find(x => x.id === el.dataset.id); if(p) await postar(p); },
    'sd-feito': async el => {
      const p = ST.posts.find(x => x.id === el.dataset.id); if(!p) return;
      const volta = p.status === 'postado', patch = { status: volta ? 'pronto' : 'postado' };
      if(!volta && ['agendado', 'erro'].includes(p.ig_status || '')) patch.ig_status = '';
      if(volta && p.data && p.hora && p.midia_url && at(p) > Date.now() + 6e4) Object.assign(patch, { ig_status: 'agendado', ig_quando: igQuando(p.data, p.hora) });
      try{ await C.api.upd('corre_posts', { id: p.id }, patch); if(!volta && C.trampo) C.trampo.ganha('post', p.id); await depois(p.id, volta ? 'Voltou pra agenda.' : 'Marcado como publicado.'); }
      catch(e){ C.toast(C.errMsg(e, 'Não deu pra marcar agora.')); }
    }
  });
  async function baixar(p){
    if(!p.midia_url){ C.toast('Esse post ainda não tem arte.'); return false; }
    try{
      let b = ST.arq && ST.arq.id === p.id ? ST.arq.file : null;
      if(!b){ const r = await fetch(p.midia_url); if(!r.ok) throw 0; b = await r.blob(); }
      const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = nomeArte(p); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true;
    }catch(e){ window.open(p.midia_url, '_blank', 'noopener'); C.toast('Abri a arte numa aba nova: segura nela e salva.', 4200); return false; }
  }

  /* conectou ou desconectou uma conta: a linha, o calendário e o painel aberto redesenham */
  if(C.ig) C.ig.onMuda(async () => {
    if(!ST.el || !ST.el.isConnected) return;
    ST.contas = C.ig.contas();
    /* a linha do Instagram muda na hora, com ou sem agenda na tela (v3.41) */
    const l0 = C.$('sd-ig'); if(l0) l0.innerHTML = autoLinha();
    if(!vivo()) return;
    try{ await carregar(); }catch(e){}
    const l = C.$('sd-ig'); if(l) l.innerHTML = autoLinha();
    corpo();
  });
  /* o que o lote (lote.js) usa daqui */
  C.studio = {
    mount, ligada: m => ligada(m), contaDoPost, estado, igQuando, quando, weekOf,
    marcas: () => ST.com, sel: () => ST.sel, posts: () => ST.posts,
    marcaAtual: () => ST.com.find(x => x.id === ST.sel) || (ST.com.length === 1 ? ST.com[0] : null),
    vivo, recarrega: async ir => { if(ir){ ST.mes = ir.slice(0, 7); ST.semana = weekOf(ir); } try{ await carregar(); }catch(e){} corpo(); }
  };
})();
