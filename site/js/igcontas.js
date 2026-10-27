/* CORRE · AS CONTAS DO INSTAGRAM (v3.40), no jeito do mLabs.
   Cada pessoa conecta o próprio Instagram fazendo login na conta (o login do Instagram, da Meta). O Corre guarda a
   conexão no servidor (o token fica cifrado e o app nunca vê) e cada post diz em qual conta vai sair. Post sem conta
   não sai sozinho: na hora, o Corre lembra e a pessoa posta à mão.
   A volta do login cai no ig.html, que guarda o código e devolve pro app; aqui o código vai pra função "instagram". */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const ST_K = 'corre-ig-state', VOLTA_K = 'corre-ig-volta';
  const IG = { lista: null, em: 0, carregando: null, onMuda: [] };
  const redirect = () => C.CFG.IG_REDIRECT || (location.origin + '/ig.html');
  const ok = c => !!c && c.status === 'ok';

  /* ---------- as contas da pessoa ---------- */
  async function carrega(force){
    if(!C.st.user){ IG.lista = []; return IG.lista; }
    if(!force && IG.lista && Date.now() - IG.em < 6e4) return IG.lista;
    if(IG.carregando) return IG.carregando;
    IG.carregando = (async () => {
      const antes = IG.lista ? assina(IG.lista) : null;
      try{ IG.lista = await C.api.q('corre_ig_contas', { eq: { dono: C.uid() }, order: ['conectada_em', true] }); }
      catch(e){ IG.lista = IG.lista || []; }
      IG.em = Date.now(); IG.carregando = null;
      try{ selos(); }catch(e){}
      /* mudou alguma coisa (conectou em outra aba, venceu, desconectou): quem mostra as contas redesenha */
      if(antes !== null && antes !== assina(IG.lista)) setTimeout(muda, 0);
      return IG.lista;
    })();
    return IG.carregando;
  }
  const assina = L => (L || []).map(c => c.id + ':' + c.status + ':' + c.username).join('|');
  const contas = () => IG.lista || [];
  const conectadas = () => contas().filter(ok);
  const porId = id => (id && contas().find(c => c.id === id)) || null;
  /* a conta conectada que tem o mesmo @ da marca (é ela que vem marcada; sem ela, a pessoa escolhe) */
  const daMarca = m => { const r = String((m && m.rede) || '').toLowerCase(); return r ? conectadas().find(c => c.username === r) || null : null; };
  const muda = () => { IG.onMuda.slice().forEach(f => { try{ f(); }catch(e){} }); try{ linhas(); }catch(e){} try{ selos(); }catch(e){} };
  /* a foto do Instagram é um link que vence: a letra fica atrás e aparece se a foto não abrir */
  const foto = (c, cls) => `<span class="ig-av${cls ? ' ' + cls : ''}" data-l="${esc((((c && c.username) || '?')[0] || '?').toUpperCase())}" aria-hidden="true">${c && c.foto ? `<img src="${esc(c.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
  const chip = c => c ? `<span class="ig-chip${ok(c) ? '' : ' off'}">${foto(c)}<b>@${esc(c.username)}</b></span>` : '';

  /* v4.18 · o Instagram de cada marca à vista (o Thales: "queria que aqui mostrasse quando tá online ou não"). No ar: a
     conta do @ da marca tá conectada e valendo (o post sai sozinho); conexão vencida; desconectada (o post vira lembrete).
     A bolinha vai no logo e a palavra depois do @; enquanto as contas não chegaram, não aparece nada (pra não piscar
     "desconectada" em quem tá no ar). Quem desenha os chips põe o selo; quando as contas chegam ou mudam, os selos se acertam */
  const MK_T = { on: 'no ar', vencida: 'conexão vencida', off: 'desconectada' };
  const redeDe = m => String((m && m.rede) || '').toLowerCase();
  function naMarca(m){
    if(IG.lista === null) return '';
    const r = redeDe(m), c = r ? contas().find(x => x.username === r) : null;
    return !c ? 'off' : ok(c) ? 'on' : 'vencida';
  }
  const selo = m => `<i class="mk-st ${naMarca(m)}" data-mk-st="${esc(redeDe(m))}" aria-hidden="true"></i>`;
  const seloTx = m => { const e = naMarca(m); return `<em class="mk-st-t ${e}" data-mk-st-t="${esc(redeDe(m))}">${e ? ' · ' + MK_T[e] : ''}</em>`; };
  function selos(){
    document.querySelectorAll('[data-mk-st]').forEach(el => { el.className = 'mk-st ' + naMarca({ rede: el.dataset.mkSt }); });
    document.querySelectorAll('[data-mk-st-t]').forEach(el => { const e = naMarca({ rede: el.dataset.mkStT }); el.className = 'mk-st-t ' + e; el.textContent = e ? ' · ' + MK_T[e] : ''; });
    document.querySelectorAll('[data-mk-noar]').forEach(el => {
      const L = String(el.dataset.mkNoar || '').split(',').filter(Boolean), n = L.filter(r => naMarca({ rede: r }) === 'on').length;
      el.textContent = IG.lista === null ? '' : ` · ${n} no ar`;
    });
  }

  /* v3.42 · ENQUANTO A META NÃO LIBERA. Com o app da Meta em teste, só quem é testador conecta; o resto bate na tela da
     Meta "função de desenvolvedor insuficiente". Com IG_ABERTO: false no config.js, o Corre avisa que chega em breve e
     deixa o testador seguir. Sem a chave (ou true), é o caminho de sempre. */
  const aberto = () => C.CFG.IG_ABERTO !== false;
  function emBreve(o){
    C.sheet(`<div class="form ig-contas"><div class="sheet-head"><h2>${ico('ig')} Instagram: em breve</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="lt-lead">A postagem automática no Instagram tá em liberação pela Meta e chega em breve pra todo mundo.</p>
      <p class="note">Até lá, o post programado vira lembrete: na hora marcada, o Corre avisa, copia a legenda e abre a arte pra você postar à mão. Quando liberar, é só conectar a conta e ele passa a sair sozinho.</p>
      <div class="acts"><button type="button" class="btn" data-close>Beleza</button><button type="button" class="btn ghost" data-act="ig-conectar" data-testador="1"${o && o.rede ? ` data-rede="${esc(o.rede)}"` : ''}>Sou testador do app: conectar</button></div></div>`);
  }
  /* ---------- conectar: vai pro login do Instagram ---------- */
  const ERRO = {
    sem_app: 'O login do Instagram ainda não foi ligado no Corre (falta o IG_APP_ID e o IG_APP_SECRET na função "instagram").',
    sem_publicar: 'Faltou a permissão de publicar. Conecta de novo e deixa a opção de publicar marcada.',
    limite_contas: 'Chegou no limite de 20 contas conectadas. Desconecta uma pra conectar outra.',
    redirect: 'O endereço de volta não bate com o que tá cadastrado no app da Meta (tem que ser …/ig.html).',
    config: 'A função "instagram" ainda não tá pronta no Supabase (falta segredo).', rede: 'Sem conexão com o Instagram agora. Tenta de novo daqui a pouco.',
    sem_funcao: 'A função "instagram" nova ainda não foi publicada no Supabase.', fn: 'A função "instagram" nova ainda não foi publicada no Supabase.', login: 'Entra no Corre de novo e conecta.'
  };
  const msgErro = e => (e && (ERRO[e.code] || (e.status === 404 && ERRO.sem_funcao) || e.detalhe)) || C.errMsg(e, 'Não deu pra conectar o Instagram.');
  const aleatorio = () => { try{ return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); }catch(e){ return String(Math.random()).slice(2) + Date.now().toString(36); } };
  function conectar(o){
    o = o || {};
    if(!C.st.user){ C.toast('Entra no Corre primeiro.'); return; }
    /* quem já conectou uma conta é testador: segue direto pra próxima */
    if(!aberto() && !o.testador && !conectadas().length) return emBreve(o);
    if(C.DEMO) return demoSheet(o);
    if(!C.CFG.IG_APP_ID){ C.toast('O login do Instagram ainda não foi ligado no Corre (falta o IG_APP_ID no config.js).', 5600); return; }
    const s = aleatorio();
    try{ sessionStorage.setItem(ST_K, JSON.stringify({ s, volta: /^#\//.test(o.volta || location.hash) ? (o.volta || location.hash) : '#/studio', t: Date.now() })); }catch(e){}
    const q = new URLSearchParams({ client_id: C.CFG.IG_APP_ID, redirect_uri: redirect(), response_type: 'code', scope: 'instagram_business_basic,instagram_business_content_publish', state: s });
    if(o.trocar) q.set('force_reauth', 'true');
    C.toast('Abrindo o Instagram: entra na conta que você quer conectar.', 4000);
    setTimeout(() => { location.href = 'https://www.instagram.com/oauth/authorize?' + q.toString(); }, 350);
  }
  /* v3.41: a última tentativa de conectar fica guardada neste aparelho. O aviso some em segundos; o motivo, não:
     o Studio e as Contas mostram até a próxima tentativa (ou uma semana) */
  const ULT_K = 'corre-ig-ultima';
  /* só guarda com login: o motivo é da pessoa, não do aparelho (outro login no mesmo celular não vê) */
  function guardaUltima(x){ const uid = C.uid(); if(!uid) return; try{ localStorage.setItem(ULT_K, JSON.stringify(Object.assign({ uid, t: Date.now() }, x))); }catch(e){} }
  function ultima(){
    let u = null; try{ u = JSON.parse(localStorage.getItem(ULT_K) || 'null'); }catch(e){}
    if(!u || typeof u !== 'object' || !u.uid || u.uid !== C.uid() || Date.now() - (Number(u.t) || 0) > 7 * 864e5) return null;
    return u;
  }
  /* a falha vale enquanto for a novidade: conectou uma conta depois (aqui ou em outro aparelho), ela sai de cena.
     Com outra conta já conectada ela continua valendo (era a tentativa de ligar mais uma) */
  const falhou = () => {
    const u = ultima(); if(!u || u.ok) return null;
    const depois = contas().some(c => ok(c) && Date.parse(c.conectada_em || c.updated_at || 0) > Number(u.t));
    return depois ? null : u;
  };
  /* "hoje às 21:20" / "12/10 às 21:20", no horário de Brasília */
  const quando = t => {
    const d = new Date(Number(t) || 0); if(isNaN(d)) return '';
    const h = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
    return (C.hojeBR(d) === C.hojeBR() ? 'hoje' : C.ddmm(C.hojeBR(d))) + ' às ' + h;
  };
  /* o quadro do motivo (Studio e Contas): o que deu errado e os dois caminhos, tentar de novo ou conferir a ligação */
  const quadroFalha = u => `<div class="ig-falha" role="status"><b>${ico('x')} O Instagram não conectou (${esc(quando(u.t))})</b><p>${esc(u.msg || 'Não deu pra conectar o Instagram.')}</p>
    <div class="ig-falha-a"><button type="button" class="btn sm pri" data-act="ig-conectar">${ico('ig')} Tentar de novo</button><button type="button" class="btn sm" data-act="ig-diag">${ico('check')} Conferir a ligação</button></div></div>`;
  /* v3.41 · a linha do estado do Instagram (na porta do Studio e dentro dele): sempre diz se tá ligado e o que fazer.
     rede: o @ da marca aberta, pra o Conectar já sugerir a conta certa */
  function linha(o){
    o = o || {};
    const rede = esc(o.rede || ''), btn = `<button type="button" class="btn sm" data-act="ig-contas">${ico('ig')} Contas</button>`;
    if(IG.lista === null) return `<span class="sd-auto-k">${ico('ig')} Instagram</span><span>Vendo as contas conectadas…</span>`;
    const L = conectadas(), falha = falhou(), vencidas = contas().filter(c => !ok(c));
    const ainda = L.length ? ` Continua${L.length > 1 ? 'm' : ''} conectada${L.length > 1 ? 's' : ''}: ${L.slice(0, 3).map(c => '@' + esc(c.username)).join(', ')}${L.length > 3 ? '…' : ''}.` : '';
    if(falha) return `<span class="sd-auto-k erro">${ico('x')} ${L.length ? 'A outra conta não conectou' : 'Instagram não conectou'}</span><span><b>${esc(quando(falha.t))}:</b> ${esc(falha.msg || 'Não deu pra conectar.')}${ainda}</span><button type="button" class="btn sm pri" data-act="ig-conectar" data-rede="${rede}">${ico('ig')} Tentar de novo</button><button type="button" class="btn sm" data-act="ig-diag">${ico('check')} Conferir a ligação</button>`;
    if(!L.length && vencidas.length) return `<span class="sd-auto-k erro">${ico('x')} Conexão vencida</span><span>A conexão com ${vencidas.slice(0, 2).map(c => '@' + esc(c.username)).join(' e ')} não vale mais: os posts programados viram lembrete até você conectar de novo.</span><button type="button" class="btn sm pri" data-act="ig-conectar" data-trocar="1">${ico('ig')} Conectar de novo</button>${btn}`;
    if(!L.length && !aberto()) return `<span class="sd-auto-k">${ico('ig')} Instagram: em breve</span><span>A postagem automática no Instagram tá em liberação pela Meta e chega em breve. Até lá, o post programado vira lembrete: na hora, o Corre avisa e você posta à mão.</span><button type="button" class="btn sm" data-act="ig-conectar" data-rede="${rede}">${ico('ig')} Saber mais</button>`;
    if(!L.length) return `<span class="sd-auto-k">${ico('ig')} Nenhuma conta conectada</span><span>Conecta o Instagram (login na conta da marca) e o que você programar sai sozinho. Sem conta, o post vira lembrete pra postar à mão.${C.DEMO ? ' <b>Demonstração:</b> a conta entra de mentira.' : ''}</span><button type="button" class="btn sm pri" data-act="ig-conectar" data-rede="${rede}">${ico('ig')} Conectar o Instagram</button><button type="button" class="btn sm" data-act="ig-diag">${ico('check')} Conferir a ligação</button>`;
    const chips = `<span class="sd-auto-k on">${L.slice(0, 3).map(c => chip(c)).join('')}${L.length > 3 ? `<b>+${L.length - 3}</b>` : ''}</span>`;
    /* uma vencida no meio das boas: os posts dela não saem, e a linha tem que dizer */
    if(vencidas.length) return `${chips}<span>${L.length === 1 ? 'Conta conectada' : L.length + ' contas conectadas'}, mas <b>a conexão com ${vencidas.slice(0, 2).map(c => '@' + esc(c.username)).join(' e ')} venceu</b>: os posts dela viram lembrete até você conectar de novo.</span><button type="button" class="btn sm pri" data-act="ig-conectar" data-trocar="1">${ico('ig')} Conectar de novo</button>${btn}`;
    return `${chips}<span>${L.length === 1 ? 'Conta conectada' : L.length + ' contas conectadas'}: o que você programar sai sozinho, na conta escolhida em cada post.</span>${btn}`;
  }
  /* quem mostra a linha sem ter o próprio redesenho (a porta do Studio) marca o elemento com data-ig-linha */
  const linhas = () => document.querySelectorAll('[data-ig-linha]').forEach(el => { el.innerHTML = linha({ rede: el.dataset.rede }); });
  /* a volta: o ig.html guardou o código; aqui confere o state (o pedido saiu daqui mesmo) e manda pra função */
  async function volta(){
    let v = null, s = null;
    try{ v = JSON.parse(sessionStorage.getItem(VOLTA_K) || 'null'); s = JSON.parse(sessionStorage.getItem(ST_K) || 'null'); }catch(e){}
    if(!v) return;
    try{ sessionStorage.removeItem(VOLTA_K); sessionStorage.removeItem(ST_K); }catch(e){}
    if(Date.now() - (Number(v.t) || 0) > 15 * 6e4) return;
    /* deu errado: o aviso rápido e o motivo guardado, com as Contas abertas pra ver na hora */
    const erro = (code, msg) => { guardaUltima({ ok: false, code, msg }); muda(); C.toast(msg, 7000); if(C.st.user) sheet(); };
    if(v.erro) return erro(v.erro, v.erro === 'access_denied' ? 'Conexão cancelada: o Instagram não foi conectado.' : 'O Instagram não conectou. Tenta de novo.');
    if(!s || !v.state || v.state !== s.s || !v.code) return erro('state', 'A volta do Instagram não bateu com o pedido. Conecta de novo pelo Studio Cria.');
    if(!C.st.user){ C.toast('Entra no Corre e conecta o Instagram de novo.', 4600); return; }
    C.toast('Conectando o Instagram…', 8000);
    try{
      const r = await C.api.fn('instagram', { acao: 'conectar', code: v.code, redirect_uri: redirect() });
      const c = r && r.conta;
      guardaUltima({ ok: true, username: c ? c.username : '' });
      await carrega(true); muda();
      C.toast(c ? `@${c.username} conectado: o que você programar pra ele sai sozinho.` : 'Instagram conectado.', 5600);
      sheet(c && c.id);
    }catch(e){ erro(e && e.code || 'fn', msgErro(e)); }
  }

  /* ---------- v3.41 · conferir a ligação ----------
     Cada peça que o login do Instagram precisa, uma por linha, com o que fazer quando falta. A função "instagram" só diz
     sim ou não (nunca o valor de um segredo). Função antiga, sem o "status": avisa que falta publicar a nova. */
  async function diagnostico(){
    const site = !!C.CFG.IG_APP_ID;
    let d = null, semFuncao = false;
    if(C.DEMO) d = { app_id: true, app_secret: true, mesmo_id: true, cofre: 'proprio', servico: true, redirect: redirect(), redirect_ok: true };
    else{
      try{ const r = await C.api.fn('instagram', { acao: 'status', app_id: C.CFG.IG_APP_ID || '', redirect_uri: redirect() }, true); d = r && r.diag; }
      catch(e){
        /* a função antiga responde sem_chave (503) ou usuario (400) pro "status"; 404 é função que nem existe.
           Sem resposta (sem sinal) ou erro do servidor não é função velha: é pra conferir de novo daqui a pouco */
        if(e && e.code === 'login') throw e;
        if(!(e && (e.code === 'sem_chave' || e.code === 'usuario' || e.status === 404 || e.status === 400))) throw { code: 'diag_rede' };
      }
      if(!d || typeof d !== 'object') semFuncao = true;
    }
    await carrega(true);
    const L = contas(), on = L.filter(ok);
    const it = (k, t, bom, txt) => ({ k, t, bom, txt });
    const itens = [it('site', 'O ID do app no site', site, site ? 'O site sabe qual app da Meta abrir.' : 'Falta o IG_APP_ID no config.js do site (o ID do app do Instagram, que é público).')];
    if(semFuncao){
      itens.push(it('funcao', 'A função "instagram" no Supabase', false, 'A função no ar ainda é a antiga, sem o Conferir. Publica a função "instagram" nova (Verify JWT desligado) e confere de novo.'));
    }else{
      itens.push(it('funcao', 'A função "instagram" no Supabase', true, 'Atualizada e respondendo.'));
      itens.push(it('app', 'O ID e a chave secreta nos Secrets', !!(d.app_id && d.app_secret),
        d.app_id && d.app_secret ? 'IG_APP_ID e IG_APP_SECRET tão salvos.' : `Falta ${[!d.app_id && 'IG_APP_ID', !d.app_secret && 'IG_APP_SECRET'].filter(Boolean).join(' e ')} em Supabase > Edge Functions > Secrets (o nome tem que ser igualzinho, em maiúsculas).`));
      if(site && d.app_id) itens.push(it('mesmo', 'O mesmo ID no site e no Supabase', d.mesmo_id !== false,
        d.mesmo_id !== false ? 'Os dois apontam pro mesmo app.' : 'O IG_APP_ID dos Secrets não é o mesmo do config.js. Tem que ser o "ID do app do Instagram", nos dois lugares.'));
      itens.push(it('cofre', 'O cadeado das conexões (IG_CHAVE)', d.cofre === 'proprio' || d.cofre === 'servico',
        d.cofre === 'proprio' ? 'A IG_CHAVE tá salva: as conexões ficam trancadas com ela.'
          : d.cofre === 'servico' ? (L.length ? 'Sem IG_CHAVE: as conexões trancam com a chave de serviço do Supabase, e tá funcionando. Não cria a IG_CHAVE agora: as contas já conectadas teriam que conectar de novo. Só quando for trocar a chave de serviço (aí cria a IG_CHAVE e conecta as contas de novo).'
            : 'Sem IG_CHAVE: as conexões trancariam com a chave de serviço do Supabase. Funciona, mas se essa chave for trocada as contas caem. Cria a IG_CHAVE (40 caracteres ou mais) antes de conectar a primeira conta.')
            : d.cofre === 'curta' ? 'A IG_CHAVE tá curta demais: precisa de pelo menos 24 caracteres (melhor 40 ou mais). Troca nos Secrets.'
              : 'Falta a IG_CHAVE nos Secrets (uma senha longa que você inventa, com 40 caracteres ou mais).'));
      itens.push(it('volta', 'O endereço de volta', !!d.redirect_ok,
        d.redirect_ok ? `Na Meta, o endereço cadastrado tem que ser exatamente ${d.redirect || redirect()}` : `O site volta por ${redirect()}, mas a função espera ${d.redirect || '…/ig.html'}. Abre o Corre por app.corresocial.com.`));
    }
    itens.push(it('contas', 'Conta conectada', on.length > 0,
      on.length ? on.map(c => '@' + c.username).join(', ') + (on.length === 1 ? ' conectada.' : ' conectadas.')
        : L.length ? 'A conexão venceu ou foi tirada: conecta de novo.' : 'Nenhuma ainda. Com tudo acima certo, é só tocar em Conectar o Instagram (a conta tem que ser Profissional e, com o app em teste, testadora).'));
    return itens;
  }
  async function diag(){
    const w = C.$('ig-diag');
    if(!w){ await sheet(); return diag(); }
    w.hidden = false;
    w.innerHTML = '<p class="note">Conferindo a ligação…</p>';
    let itens = null;
    try{ itens = await diagnostico(); }
    catch(e){ w.innerHTML = `<p class="note">${esc(e && e.code === 'diag_rede' ? 'Não deu pra falar com o Supabase agora (sem sinal ou servidor ocupado). Confere de novo daqui a pouco.' : msgErro(e))}</p>`; return; }
    const W = C.$('ig-diag'); if(!W) return;
    const falta = itens.filter(x => !x.bom).length;
    W.innerHTML = `<p class="ig-diag-h">${falta ? `${ico('x')} Falta ${falta === 1 ? '1 coisa' : falta + ' coisas'}` : `${ico('check')} Tudo ligado`}${C.DEMO ? ' <small>(demonstração)</small>' : ''}</p>
      <ul class="ig-diag">${itens.map(x => `<li class="${x.bom ? 'bom' : 'falta'}" data-k="${esc(x.k)}"><span class="ig-diag-m" aria-hidden="true">${ico(x.bom ? 'check' : 'x')}</span><div><b>${esc(x.t)}</b><span>${esc(x.txt)}</span></div></li>`).join('')}</ul>`;
  }
  /* na demonstração não tem Meta: a conta entra de mentira, pra ver o caminho inteiro */
  function demoSheet(o){
    const sug = String((o && o.rede) || '').toLowerCase();
    C.sheet(`<div class="form ig-demo"><div class="sheet-head"><h2>${ico('ig')} Conectar o Instagram</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note"><b>Demonstração:</b> no Corre de verdade, aqui abre o login do Instagram e você entra na conta. Na demonstração, é só dizer qual @ conectar (nada vai pro Instagram).</p>
      <div class="fld"><label for="ig-demo-u">O @ da conta</label><span class="at"><input class="inp" id="ig-demo-u" maxlength="30" value="${esc(sug)}" placeholder="perfil.da.marca" autocapitalize="none" spellcheck="false"></span></div>
      <div class="acts"><button type="button" class="btn pri" data-act="ig-demo-ok">${ico('ig')} Conectar (demonstração)</button></div></div>`);
    setTimeout(() => { const i = C.$('ig-demo-u'); if(i) i.focus(); }, 60);
  }
  async function demoOk(){
    const u = String((C.$('ig-demo-u') || {}).value || '').trim().replace(/^@/, '').toLowerCase();
    if(!/^[a-z0-9_.]{1,30}$/.test(u)){ C.toast('Coloca o @ da conta.'); return; }
    await carrega(true);
    const ja = contas().find(c => c.username === u);
    try{
      if(ja) await C.api.upd('corre_ig_contas', { id: ja.id }, { status: 'ok', erro: '', updated_at: new Date().toISOString() });
      else await C.api.ins('corre_ig_contas', { ig_id: String(17841400000000 + (C.hash(u) % 1e8)), app_uid: '', username: u, nome: '', foto: '', tipo: 'BUSINESS', status: 'ok', erro: '', expira_em: new Date(Date.now() + 60 * 864e5).toISOString(), conectada_em: new Date().toISOString(), updated_at: new Date().toISOString() });
      await carrega(true); muda();
      const c = contas().find(x => x.username === u);
      C.toast(`@${u} conectado (demonstração).`, 3600);
      sheet(c && c.id);
    }catch(e){ C.toast(C.errMsg(e, 'Não deu pra conectar.')); }
  }

  /* ---------- a folha das contas ---------- */
  const estado = c => c.status === 'ok' ? (c.expira_em ? `Conectada · a conexão renova sozinha (até ${C.ddmm ? C.ddmm(c.expira_em) : String(c.expira_em).slice(0, 10)})` : 'Conectada')
    : c.status === 'expirou' ? 'A conexão venceu: conecta de novo' : 'A conta tirou a permissão do Corre: conecta de novo';
  async function sheet(novo){
    await carrega();
    const L = contas();
    C.sheet(`<div class="form ig-contas"><div class="sheet-head"><h2>${ico('ig')} Contas do Instagram</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="lt-lead">Cada conta entra com o login dela, no próprio Instagram. O Corre só publica o que você programar, na conta que você escolher no post.</p>
      ${falhou() ? quadroFalha(falhou()) : ''}
      ${L.length ? `<ul class="ig-lista">${L.map(c => `<li class="ig-l${ok(c) ? '' : ' off'}${c.id === novo ? ' novo' : ''}">${foto(c, 'g')}<div class="ig-l-tx"><b>@${esc(c.username)}</b>${c.nome ? `<small>${esc(c.nome)}</small>` : ''}<span class="ig-st">${esc(estado(c))}</span>${c.erro && !ok(c) ? `<span class="ig-st erro">${esc(c.erro)}</span>` : ''}</div>
        <div class="ig-l-a">${ok(c) ? '' : `<button type="button" class="btn sm pri" data-act="ig-conectar" data-trocar="1">Conectar de novo</button>`}<button type="button" class="btn sm ghost" data-act="ig-desconectar" data-id="${esc(c.id)}">Desconectar</button></div></li>`).join('')}</ul>`
        : `<p class="note ig-vazio">${aberto() ? 'Nenhuma conta conectada ainda. Sem conta, o post programado vira lembrete: na hora, você posta à mão.' : 'A postagem automática no Instagram tá em liberação pela Meta e chega em breve. Até lá, o post programado vira lembrete: na hora, você posta à mão.'}</p>`}
      <div class="acts"><button type="button" class="btn pri" data-act="ig-conectar">${ico('ig')} ${L.length ? 'Conectar outra conta' : 'Conectar o Instagram'}</button>${L.length && !C.DEMO ? `<button type="button" class="btn ghost" data-act="ig-conectar" data-trocar="1">Entrar com outro login</button>` : ''}${falhou() ? '' : `<button type="button" class="btn ghost" data-act="ig-diag">${ico('check')} Conferir a ligação</button>`}</div>
      <div class="ig-diag-w" id="ig-diag" aria-live="polite" hidden></div>
      <p class="fine">Precisa ser conta Profissional (Comercial ou Criador de conteúdo). O Instagram abre e pede o login: entra na conta da marca e deixa a permissão de publicar marcada. Se ele já entrar logado na conta errada, usa o "Entrar com outro login". Desconectar tira a conexão daqui na hora (e o que tava programado nela volta pra "postar à mão").</p></div>`);
  }
  async function desconectar(el){
    const c = porId(el.dataset.id); if(!c) return;
    if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = `Desconectar @${c.username}?`; return; }
    el.disabled = true;
    try{ await C.api.del('corre_ig_contas', { id: c.id }); await carrega(true); muda(); C.toast(`@${c.username} desconectado.`, 3600); sheet(); }
    catch(e){ el.disabled = false; C.toast(C.errMsg(e, 'Não deu pra desconectar agora.')); }
  }

  /* ---------- o "Postar em" (editor, lote e o painel do post) ---------- */
  /* sel: o id escolhido; m: a marca (pra avisar quando nenhuma conta tem o @ dela) */
  function seletor(id, sel, m){
    const L = conectadas(), atual = porId(sel), rede = String((m && m.rede) || '').toLowerCase();
    const temMarca = !!rede && L.some(c => c.username === rede);
    const opts = L.map(c => `<option value="${esc(c.id)}"${c.id === sel ? ' selected' : ''}>@${esc(c.username)}${c.nome ? ' · ' + esc(c.nome) : ''}</option>`).join('')
      + (atual && !ok(atual) ? `<option value="${esc(atual.id)}" selected disabled>@${esc(atual.username)} (conexão vencida)</option>` : '')
      + `<option value=""${!sel ? ' selected' : ''}>Ninguém: eu posto à mão (o Corre me lembra)</option>`;
    const dica = !L.length && !aberto() ? `A postagem automática no Instagram chega em breve. Até lá, o post vira lembrete pra postar à mão.`
      : !L.length ? `Nenhuma conta conectada: o post vira lembrete. <button type="button" class="lnk" data-act="ig-conectar">Conectar o Instagram</button> (login na conta) pra ele sair sozinho.`
      : !sel ? `Escolhe a conta${rede && !temMarca ? ` (a @${esc(rede)} ainda não tá conectada: <button type="button" class="lnk" data-act="ig-conectar" data-rede="${esc(rede)}">conectar</button>)` : ''}. Sem conta, não sai sozinho.`
      : `Sai sozinho nessa conta, no dia e na hora. <button type="button" class="lnk" data-act="ig-contas">Contas</button>`;
    return `<div class="fld ig-sel"><label for="${esc(id)}">${ico('ig')} Postar em</label><select class="inp" id="${esc(id)}" data-ig-sel>${opts}</select><span class="hint">${dica}</span></div>`;
  }
  const lido = id => { const el = C.$(id); return el && el.value ? el.value : null; };

  Object.assign(C.acts, {
    'ig-contas': () => sheet(),
    'ig-conectar': el => conectar({ trocar: !!(el && el.dataset && el.dataset.trocar), rede: el && el.dataset && el.dataset.rede, testador: !!(el && el.dataset && el.dataset.testador) }),
    'ig-desconectar': el => desconectar(el),
    'ig-demo-ok': () => demoOk(),
    'ig-diag': () => diag()
  });

  C.ig = { carrega, contas, conectadas, porId, daMarca, ok, foto, chip, naMarca, selo, seloTx, selos, conectar, volta, sheet, seletor, lido, msgErro, ultima, falhou, quando, quadroFalha, diagnostico, linha, linhas, aberto, onMuda: f => { if(typeof f === 'function' && !IG.onMuda.includes(f)) IG.onMuda.push(f); }, esquece: () => { IG.lista = null; IG.em = 0; } };
})();
