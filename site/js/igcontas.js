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
  const muda = () => IG.onMuda.slice().forEach(f => { try{ f(); }catch(e){} });
  /* a foto do Instagram é um link que vence: a letra fica atrás e aparece se a foto não abrir */
  const foto = (c, cls) => `<span class="ig-av${cls ? ' ' + cls : ''}" data-l="${esc((((c && c.username) || '?')[0] || '?').toUpperCase())}" aria-hidden="true">${c && c.foto ? `<img src="${esc(c.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
  const chip = c => c ? `<span class="ig-chip${ok(c) ? '' : ' off'}">${foto(c)}<b>@${esc(c.username)}</b></span>` : '';

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
    if(C.DEMO) return demoSheet(o);
    if(!C.CFG.IG_APP_ID){ C.toast('O login do Instagram ainda não foi ligado no Corre (falta o IG_APP_ID no config.js).', 5600); return; }
    const s = aleatorio();
    try{ sessionStorage.setItem(ST_K, JSON.stringify({ s, volta: /^#\//.test(o.volta || location.hash) ? (o.volta || location.hash) : '#/studio', t: Date.now() })); }catch(e){}
    const q = new URLSearchParams({ client_id: C.CFG.IG_APP_ID, redirect_uri: redirect(), response_type: 'code', scope: 'instagram_business_basic,instagram_business_content_publish', state: s });
    if(o.trocar) q.set('force_reauth', 'true');
    C.toast('Abrindo o Instagram: entra na conta que você quer conectar.', 4000);
    setTimeout(() => { location.href = 'https://www.instagram.com/oauth/authorize?' + q.toString(); }, 350);
  }
  /* a volta: o ig.html guardou o código; aqui confere o state (o pedido saiu daqui mesmo) e manda pra função */
  async function volta(){
    let v = null, s = null;
    try{ v = JSON.parse(sessionStorage.getItem(VOLTA_K) || 'null'); s = JSON.parse(sessionStorage.getItem(ST_K) || 'null'); }catch(e){}
    if(!v) return;
    try{ sessionStorage.removeItem(VOLTA_K); sessionStorage.removeItem(ST_K); }catch(e){}
    if(Date.now() - (Number(v.t) || 0) > 15 * 6e4) return;
    if(v.erro){ C.toast(v.erro === 'access_denied' ? 'Conexão cancelada: o Instagram não foi conectado.' : 'O Instagram não conectou. Tenta de novo.', 5000); return; }
    if(!s || !v.state || v.state !== s.s || !v.code){ C.toast('A volta do Instagram não bateu com o pedido. Conecta de novo pelo Studio.', 5200); return; }
    if(!C.st.user){ C.toast('Entra no Corre e conecta o Instagram de novo.', 4600); return; }
    C.toast('Conectando o Instagram…', 8000);
    try{
      const r = await C.api.fn('instagram', { acao: 'conectar', code: v.code, redirect_uri: redirect() });
      await carrega(true); muda();
      const c = r && r.conta;
      C.toast(c ? `@${c.username} conectado: o que você programar pra ele sai sozinho.` : 'Instagram conectado.', 5600);
      sheet(c && c.id);
    }catch(e){ C.toast(msgErro(e), 7000); }
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
      ${L.length ? `<ul class="ig-lista">${L.map(c => `<li class="ig-l${ok(c) ? '' : ' off'}${c.id === novo ? ' novo' : ''}">${foto(c, 'g')}<div class="ig-l-tx"><b>@${esc(c.username)}</b>${c.nome ? `<small>${esc(c.nome)}</small>` : ''}<span class="ig-st">${esc(estado(c))}</span>${c.erro && !ok(c) ? `<span class="ig-st erro">${esc(c.erro)}</span>` : ''}</div>
        <div class="ig-l-a">${ok(c) ? '' : `<button type="button" class="btn sm pri" data-act="ig-conectar" data-trocar="1">Conectar de novo</button>`}<button type="button" class="btn sm ghost" data-act="ig-desconectar" data-id="${esc(c.id)}">Desconectar</button></div></li>`).join('')}</ul>`
        : `<p class="note ig-vazio">Nenhuma conta conectada ainda. Sem conta, o post programado vira lembrete: na hora, você posta à mão.</p>`}
      <div class="acts"><button type="button" class="btn pri" data-act="ig-conectar">${ico('ig')} ${L.length ? 'Conectar outra conta' : 'Conectar o Instagram'}</button>${L.length && !C.DEMO ? `<button type="button" class="btn ghost" data-act="ig-conectar" data-trocar="1">Entrar com outro login</button>` : ''}</div>
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
    const dica = !L.length ? `Nenhuma conta conectada: o post vira lembrete. <button type="button" class="lnk" data-act="ig-conectar">Conectar o Instagram</button> (login na conta) pra ele sair sozinho.`
      : !sel ? `Escolhe a conta${rede && !temMarca ? ` (a @${esc(rede)} ainda não tá conectada: <button type="button" class="lnk" data-act="ig-conectar" data-rede="${esc(rede)}">conectar</button>)` : ''}. Sem conta, não sai sozinho.`
      : `Sai sozinho nessa conta, no dia e na hora. <button type="button" class="lnk" data-act="ig-contas">Contas</button>`;
    return `<div class="fld ig-sel"><label for="${esc(id)}">${ico('ig')} Postar em</label><select class="inp" id="${esc(id)}" data-ig-sel>${opts}</select><span class="hint">${dica}</span></div>`;
  }
  const lido = id => { const el = C.$(id); return el && el.value ? el.value : null; };

  Object.assign(C.acts, {
    'ig-contas': () => sheet(),
    'ig-conectar': el => conectar({ trocar: !!(el && el.dataset && el.dataset.trocar), rede: el && el.dataset && el.dataset.rede }),
    'ig-desconectar': el => desconectar(el),
    'ig-demo-ok': () => demoOk()
  });

  C.ig = { carrega, contas, conectadas, porId, daMarca, ok, foto, chip, conectar, volta, sheet, seletor, lido, msgErro, onMuda: f => { if(typeof f === 'function' && !IG.onMuda.includes(f)) IG.onMuda.push(f); }, esquece: () => { IG.lista = null; IG.em = 0; } };
})();
