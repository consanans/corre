/* CORRE · AVISOS NO CELULAR (web push, v3.35). Mensagem e pedido, resposta e menção, seguidor novo e curtida chegam
   na tela de bloqueio, com o Corre fechado. Quem liga é a pessoa, em cada aparelho (o navegador pergunta antes).
   No iPhone só funciona com o Corre na Tela de Início (iOS 16.4 ou mais novo): o ajuste ensina o caminho.
   Depois de cada ação (mandar mensagem, responder, seguir, curtir), o site chama a função "push"; o banco decide quem
   recebe (supabase/delta-v335.sql) e a função manda criptografado. O service worker (sw.js) mostra e abre no lugar certo.
   v4.06: os lembretes. No fim da tarde, no máximo um por dia e só com novidade pra pessoa (visita no link na bio, pedido
   no Mural pro corre dela, o que falta no perfil, post de quem ela segue), o Corre chama de volta quem não abriu no dia
   (supabase/delta-v406.sql). Liga e desliga aqui ("Lembretes do Corre"), com um exemplo pra ver como chega. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const P = { on: false, ajustes: null, carregando: false, ocupado: false, log: [], syncDe: null, semFuncao: false, semBanco: false, reg: null };
  const K_CHAVE = 'corre-push-chave', K_ON = 'corre-push-on:', K_EP = 'corre-push-ep:', K_FX = 'corre-push-faixa:';
  const ua = navigator.userAgent || '';
  const IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/i.test(ua);
  const dentroDeApp = () => C.insta && C.insta.dentroDeApp ? C.insta.dentroDeApp() : /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|WhatsApp|musical_ly|TikTok|BytedanceWebview|; wv\)/i.test(ua);
  const instalado = () => { try{ return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches; }catch(e){ return false; } };
  /* a demonstração finge tudo (não tem banco nem função); o teste liga o caminho de verdade com CORRE_PUSH_REAL */
  const real = () => !C.DEMO || window.CORRE_PUSH_REAL === true;
  const temPush = () => { try{ return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext !== false && !C.EMBED; }catch(e){ return false; } };
  const ls = { get: k => { try{ return localStorage.getItem(k); }catch(e){ return null; } }, set: (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} }, del: k => { try{ localStorage.removeItem(k); }catch(e){} } };
  const ligadoAqui = u => !!u && ls.get(K_ON + u) === '1';
  const marcaAqui = (u, on) => { if(!u) return; if(on) ls.set(K_ON + u, '1'); else { ls.del(K_ON + u); ls.del(K_EP + u); } P.on = !!on; };
  const semBanco = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|function .* does not exist/i.test(e.message || ''));
  const b64u = buf => { const b = new Uint8Array(buf); let s = ''; for(let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const deB64u = s => { let t = String(s).replace(/-/g, '+').replace(/_/g, '/'); while(t.length % 4) t += '='; const bin = atob(t), out = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

  /* ---------- em que pé tá neste aparelho ---------- */
  function estado(){
    if(C.EMBED) return 'sem-suporte';
    if(!real()) return P.on ? 'ligado' : 'desligado';
    if(dentroDeApp()) return 'iab';
    /* iPhone e iPad: aviso de site só com o Corre na Tela de Início */
    if(IOS && !instalado()) return 'ios-instalar';
    if(!temPush()) return 'sem-suporte';
    if(Notification.permission === 'denied') return 'bloqueado';
    if(Notification.permission === 'granted' && P.on) return 'ligado';
    return 'desligado';
  }

  /* ---------- a chave pública do Corre (da função; guardada uma semana) ---------- */
  async function chave(fresca){
    if(!fresca){ try{ const c = JSON.parse(ls.get(K_CHAVE) || 'null'); if(c && /^[A-Za-z0-9_-]{87}$/.test(c.k) && Date.now() - c.em < 7 * 864e5) return c.k; }catch(e){} }
    const r = await C.api.fn('push', { acao: 'chave' }, true);
    if(!r || !/^[A-Za-z0-9_-]{87}$/.test(r.chave || '')) throw { code: 'chave' };
    ls.set(K_CHAVE, JSON.stringify({ k: r.chave, em: Date.now() }));
    return r.chave;
  }
  async function registro(){
    if(P.reg) return P.reg;
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    /* espera ficar ativo (no máximo 8 s) */
    if(!reg.active){
      await new Promise(res => {
        const w = reg.installing || reg.waiting; if(!w){ res(); return; }
        const t = setTimeout(res, 8000);
        w.addEventListener('statechange', () => { if(w.state === 'activated' || w.state === 'redundant'){ clearTimeout(t); res(); } });
      });
    }
    P.reg = reg; return reg;
  }
  const mesmaChave = (sub, k) => { try{ const a = sub && sub.options && sub.options.applicationServerKey; return !a || b64u(a) === k; }catch(e){ return true; } };
  const resumoUA = () => [IOS ? 'iPhone' : ANDROID ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux|CrOS/.test(ua) ? 'Linux' : 'Outro',
    /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '',
    instalado() ? 'app' : ''].filter(Boolean).join(' · ');
  /* inscreve (ou reaproveita a inscrição) e guarda no banco */
  async function inscreve(fresca){
    const reg = await registro();
    const k = await chave(fresca);
    let sub = await reg.pushManager.getSubscription();
    /* inscrição feita com outra chave (o Corre trocou a dele): cancela, tira do banco e faz outra */
    if(sub && !mesmaChave(sub, k)){ const velho = sub.endpoint; try{ await sub.unsubscribe(); }catch(e){} try{ await C.api.rpc('corre_push_tirar', { p_endpoint: velho }); }catch(e){} sub = null; }
    if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(k) });
    const j = sub.toJSON ? sub.toJSON() : sub, keys = j.keys || {};
    try{
      P.ajustes = await C.api.rpc('corre_push_salvar', { p_endpoint: j.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_ua: resumoUA() });
    }catch(e){
      /* inscrição velha que o navegador aposentou: tira e faz outra, uma vez */
      if(!fresca && e && /endpoint|chave/.test(e.hint || e.message || '')){ try{ await sub.unsubscribe(); }catch(er){} return inscreve(true); }
      throw e;
    }
    ls.set(K_EP + C.uid(), JSON.stringify({ ep: j.endpoint, em: Date.now() }));
    return j.endpoint;
  }

  /* ---------- ligar e desligar neste aparelho ---------- */
  async function ligar(){
    const u = C.uid(); if(!u || !C.st.me || P.ocupado) return;
    if(!real()){
      P.ocupado = true;
      try{ P.ajustes = await C.api.rpc('corre_push_salvar', { p_endpoint: 'https://fcm.googleapis.com/fcm/send/demo-' + u, p_p256dh: 'B' + 'x'.repeat(86), p_auth: 'y'.repeat(22), p_ua: 'demonstração' }); marcaAqui(u, true); C.toast('Avisos ligados. Na demonstração não chega aviso de verdade; no Corre, chega no celular.', 4200); refazPassos(); }
      catch(e){ C.toast(C.errMsg(e)); }
      finally{ P.ocupado = false; pinta(); }
      return;
    }
    const e0 = estado();
    if(e0 !== 'desligado' && e0 !== 'ligado'){ pinta(); return; }
    /* a pergunta do navegador tem que sair direto do toque (Safari não deixa depois de esperar outra coisa) */
    let perm = Notification.permission;
    P.ocupado = true; pinta();
    try{
      if(perm !== 'granted') perm = await new Promise(res => { const r = Notification.requestPermission(res); if(r && r.then) r.then(res, () => res('default')); });
      if(perm !== 'granted'){ C.toast(perm === 'denied' ? 'O navegador bloqueou os avisos. Dá pra liberar nos ajustes do site.' : 'Sem permissão, sem aviso. Quando quiser, é só ligar de novo.', 4200); return; }
      await inscreve(false);
      marcaAqui(u, true);
      C.toast('Avisos ligados neste aparelho.', 3000);
      refazPassos();
    }catch(e){
      console.warn('[corre] avisos', e);
      C.toast(erroTxt(e), 4600);
    }finally{ P.ocupado = false; pinta(); }
  }
  const refazPassos = () => { if(C.estreia && C.estreia.refaz) C.estreia.refaz(); document.querySelectorAll('.psh-faixa').forEach(f => { if(estado() === 'ligado') f.remove(); }); };
  function erroTxt(e){
    const c = e && (e.code || e.name);
    if(semBanco(e) || c === 'nofn' || (e && e.status === 404)) return 'Os avisos no celular ainda tão chegando no Corre. Tenta de novo mais tarde.';
    if(c === 'NotAllowedError') return 'O navegador não deixou ligar os avisos. Confere a permissão do site.';
    if(c === 'AbortError' || c === 'InvalidStateError') return 'O serviço de avisos do navegador não respondeu. Tenta de novo daqui a pouco.';
    return C.errMsg(e, 'Não deu pra ligar os avisos agora.');
  }
  async function desligar(){
    const u = C.uid(); if(!u || P.ocupado) return;
    P.ocupado = true; pinta();
    try{
      let ep = 'https://fcm.googleapis.com/fcm/send/demo-' + u, sub = null;
      if(real() && temPush()){
        const reg = await navigator.serviceWorker.getRegistration('./');
        sub = reg && await reg.pushManager.getSubscription();
        ep = sub ? sub.endpoint : '';
      }
      if(ep) try{ await C.api.rpc('corre_push_tirar', { p_endpoint: ep }); }catch(e){ if(!semBanco(e)) throw e; }
      if(sub) try{ await sub.unsubscribe(); }catch(e){}
      marcaAqui(u, false);
      C.toast('Avisos desligados neste aparelho.');
      refazPassos();
      P.ajustes = null; carregaAjustes();
    }catch(e){ C.toast(C.errMsg(e)); }
    finally{ P.ocupado = false; pinta(); }
  }
  /* saiu da conta: este aparelho para de receber dessa conta (se entrar de novo, volta sozinho) */
  async function sair(){
    const u = C.uid(); if(!u || !ligadoAqui(u)) return;
    try{
      let ep = 'https://fcm.googleapis.com/fcm/send/demo-' + u;
      if(real()){ if(!temPush()) return; const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription(); ep = sub ? sub.endpoint : ''; }
      if(ep) await Promise.race([C.api.rpc('corre_push_tirar', { p_endpoint: ep }), new Promise(r => setTimeout(r, 2500))]);
    }catch(e){}
    /* no aparelho de verdade a marca fica: se a mesma pessoa entrar de novo, os avisos voltam sozinhos */
    if(!real()) marcaAqui(u, false);
    ls.del(K_EP + u); P.on = false; P.ajustes = null; P.syncDe = null;
    badge(0);
  }
  /* ao abrir o Corre: confere se a inscrição ainda vale e renova no banco (uma vez a cada 3 dias, ou se mudou) */
  async function sync(forca){
    const u = C.uid(); if(!u || !C.st.me) return;
    P.on = ligadoAqui(u);
    if(!P.on || !real() || !temPush() || (!forca && P.syncDe === u)) return;
    P.syncDe = u;
    if(Notification.permission !== 'granted'){ if(Notification.permission === 'denied') marcaAqui(u, false); return; }
    try{
      const reg = await registro();
      const sub = await reg.pushManager.getSubscription();
      let salvo = null; try{ salvo = JSON.parse(ls.get(K_EP + u) || 'null'); }catch(e){}
      const k = await chave(false);
      if(!forca && sub && mesmaChave(sub, k) && salvo && salvo.ep === sub.endpoint && Date.now() - salvo.em < 3 * 864e5) return;
      await inscreve(false);
    }catch(e){ console.warn('[corre] avisos (sync)', e); }
  }

  /* ---------- depois de cada ação: avisa quem tem que saber (sem esperar, sem travar nada) ---------- */
  function avisa(tipo, id){
    if(!C.uid() || !tipo || typeof id !== 'string' || id.length < 2 || id.length > 64) return;
    P.log.push({ tipo, id, em: Date.now() }); if(P.log.length > 50) P.log.shift();
    if(!real() || P.semFuncao) return;
    Promise.resolve().then(() => C.api.fn('push', { tipo, id }, true)).catch(e => { if(e && (e.status === 404 || e.code === 'nofn')) P.semFuncao = true; });
  }
  /* o número no ícone do app (mensagens não lidas + pedidos) */
  function badge(n){
    try{
      if(!('setAppBadge' in navigator)) return;
      const p = n > 0 ? navigator.setAppBadge(Math.min(n, 999)) : navigator.clearAppBadge();
      if(p && p.catch) p.catch(() => {});
    }catch(e){}
  }

  /* ---------- o ajuste (folha) ---------- */
  const TIPOS = [['msg', 'Mensagens e pedidos', 'Quem te chama, na hora (e o papo dos teus grupos).'], ['resp', 'Respostas e menções', 'Respondeu, citou ou te marcou.'],
    ['seg', 'Seguidor novo e grupos', 'Seguidor junta num aviso só no dia. Pedido pra entrar no teu grupo e quando te aceitam.'], ['curt', 'Curtidas', 'Curtiu ou fortaleceu teu post, curtiu teu story.'],
    /* v4.06: só aparece com o banco novo (o ajuste traz "lembra") */
    ['lembra', 'Lembretes do Corre', 'No fim da tarde, no máximo um por dia e só quando tem novidade pra você: visita no teu link na bio, pedido no Mural pro teu corre, o que falta no teu perfil.']];
  /* o botão Compartilhar do Safari (quadrado com a seta pra cima), desenhado aqui pra pessoa reconhecer */
  const COMPARTILHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11.5M8 7l4-4 4 4"/><path d="M8.5 10.5H6v10h12v-10h-2.5"/></svg>';
  function passosIOS(){
    return `<ol class="psh-passos">
      <li>No Safari, toca em <b>Compartilhar</b> <span class="psh-k" aria-hidden="true">${COMPARTILHAR}</span> (embaixo, no meio).</li>
      <li>Escolhe <b>Adicionar à Tela de Início</b> e confirma.</li>
      <li>Abre o Corre pelo ícone novo, entra com o Google e liga os avisos aqui.</li></ol>
      <p class="fine">Precisa do iOS 16.4 ou mais novo. No iPhone, o aviso só chega pelo Corre da Tela de Início.</p>`;
  }
  function statusHTML(e){
    const n = P.ajustes && Number(P.ajustes.aparelhos) || 0;
    const S = {
      ligado: ['on', 'bell', 'Ligado neste aparelho', n > 1 ? `E em mais ${n - 1} ${n - 1 === 1 ? 'aparelho' : 'aparelhos'}. Cada um liga e desliga o seu.` : 'Chega com o Corre fechado, na tela de bloqueio.'],
      desligado: ['off', 'bell', 'Desligado neste aparelho', 'Toca em ligar: o navegador pergunta se o Corre pode avisar. Diz que sim.'],
      bloqueado: ['bloq', 'lock', 'Bloqueado neste navegador', IOS ? 'Libera em Ajustes › Notificações › Corre, e volta aqui.' : 'Toca no cadeado (ou no ⓘ) ao lado do endereço › Notificações › Permitir. Depois volta aqui.'],
      'ios-instalar': ['ios', 'cel', 'No iPhone, pela Tela de Início', 'A Apple só deixa site mandar aviso quando ele mora na Tela de Início. Leva 10 segundos:'],
      iab: ['iab', 'ext', 'Abre no navegador', 'Dentro do Instagram ou do WhatsApp não dá pra ligar aviso. Abre o Corre no Chrome ou no Safari.'],
      'sem-suporte': ['sem', 'x', 'Esse navegador não recebe aviso', IOS ? 'Atualiza o iPhone (iOS 16.4 ou mais novo) e abre o Corre pela Tela de Início.' : 'No Android, usa o Chrome. No computador, Chrome, Edge, Firefox ou Safari.']
    }[e] || ['off', 'bell', '', ''];
    return `<div class="psh-st ${S[0]}"><span class="psh-ic" aria-hidden="true">${ico(S[1])}</span><div><b>${S[2]}</b><p>${S[3]}</p></div></div>`;
  }
  function folhaHTML(){
    const e = estado(), a = P.ajustes || {}, liga = e === 'ligado';
    const pode = e === 'ligado' || e === 'desligado';
    const botao = P.ocupado ? `<button type="button" class="btn" disabled>Um instante…</button>`
      : liga ? `<button type="button" class="btn" data-act="push-desligar">Desligar neste aparelho</button><button type="button" class="btn ghost" data-act="push-teste">Mandar um teste</button>`
      : e === 'desligado' ? `<button type="button" class="btn pri" data-act="push-ligar">${ico('bell')} Ligar os avisos</button>`
      : e === 'iab' ? `<button type="button" class="btn pri" data-act="iab-copia">Copiar o link</button>`
      : e === 'bloqueado' ? `<button type="button" class="btn" data-act="push-confere">Já liberei</button>` : '';
    const tipos = P.semBanco ? '' : `<fieldset class="psh-tipos"${a.msg === undefined ? ' disabled' : ''}><legend>O que chega</legend>
      ${TIPOS.filter(([k]) => k !== 'lembra' || a.lembra !== undefined).map(([k, t, s]) => `<label class="switch sm"><input type="checkbox" data-chg="push-tipo" data-k="${k}"${a[k] !== false ? ' checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>${t}</b><small>${s}</small></span></label>${k === 'msg' ? `<label class="switch sm psh-sub"><input type="checkbox" data-chg="push-tipo" data-k="texto"${a.texto !== false ? ' checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>Mostrar o texto da mensagem</b><small>Desligado, chega só "mandou uma mensagem".</small></span></label>` : ''}${k === 'lembra' && liga ? `<button type="button" class="lnk psh-ex" data-act="push-lembra-teste"${a.lembra === false ? ' hidden' : ''}>Mandar um lembrete de exemplo</button>` : ''}`).join('')}
      <p class="fine">Vale pra todos os teus aparelhos. Quem você bloqueou não te avisa de nada.</p></fieldset>`;
    return `<div class="form psh"><div class="sheet-head"><h2>${ico('bell')} Avisos no celular</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${statusHTML(e)}${e === 'ios-instalar' ? passosIOS() : ''}
      ${botao ? `<div class="acts psh-acts">${botao}</div>` : ''}
      ${pode || P.ajustes ? tipos : ''}
      ${P.semBanco ? '<p class="note">Os avisos no celular ainda tão chegando no Corre.</p>' : ''}
      <p class="fine psh-pv">O aviso sai criptografado do Corre: o Google, a Apple e a Mozilla só entregam, não leem.</p></div>`;
  }
  const aberta = () => !!document.querySelector('#sheet .psh');
  function pinta(){ if(!aberta()) return; const s = document.querySelector('#sheet .psh'); const novo = document.createElement('div'); novo.innerHTML = folhaHTML(); s.replaceWith(novo.firstElementChild); }
  async function carregaAjustes(){
    if(!C.uid() || P.carregando) return;
    P.carregando = true;
    try{
      let ep = null;
      if(real() && temPush() && P.on){ try{ const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription(); ep = sub ? sub.endpoint : null; }catch(e){} }
      else if(!real() && P.on) ep = 'https://fcm.googleapis.com/fcm/send/demo-' + C.uid();
      P.ajustes = await C.api.rpc('corre_push_ajustes', { p_endpoint: ep }); P.semBanco = false;
      /* o banco não conhece mais este aparelho (o serviço de aviso disse que ele saiu): inscreve de novo, quieto */
      if(P.on && P.ajustes && P.ajustes.este === false && real() && temPush() && Notification.permission === 'granted'){
        try{ await inscreve(false); }catch(e){ P.on = false; }
      }
    }catch(e){ if(semBanco(e)) P.semBanco = true; }
    finally{ P.carregando = false; pinta(); }
  }
  function abrir(){
    if(!C.uid() || !C.st.me){ C.toast('Entra no Corre pra ligar os avisos.'); return; }
    P.on = ligadoAqui(C.uid());
    C.sheet(folhaHTML());
    carregaAjustes();
  }

  /* ---------- o convite (na caixa de mensagens e no sino) ---------- */
  function faixa(onde){
    const e = estado();
    if(!C.uid() || !C.st.me || (e !== 'desligado' && e !== 'ios-instalar')) return '';
    let fx = 0; try{ fx = Number(ls.get(K_FX + onde)) || 0; }catch(er){}
    if(Date.now() - fx < 21 * 864e5) return '';
    const txt = onde === 'msg' ? 'Liga os avisos e fica sabendo na hora quando chegar mensagem.'
      : onde === 'bio' ? 'Liga os avisos e o Corre te conta no celular quando teu link na bio tiver visita.'
      : onde === 'horus' ? 'Liga os avisos e o celular apita na hora que chegar pedido de orçamento.'
      : 'Curtida, resposta e seguidor novo no celular, com o Corre fechado.';
    return `<div class="psh-faixa" data-onde="${esc(onde)}"><span class="psh-fx-ic" aria-hidden="true">${ico('bell')}</span><p>${txt}</p>
      <button type="button" class="btn sm pri" data-act="push-ajustes">${e === 'ios-instalar' ? 'Como ligar' : 'Ligar'}</button>
      <button type="button" class="cbtn plain psh-fx-x" data-act="push-faixa-x" data-onde="${esc(onde)}" aria-label="Agora não">${ico('x')}</button></div>`;
  }

  /* ---------- o que o service worker conta ---------- */
  if('serviceWorker' in navigator && !C.EMBED){
    try{
      navigator.serviceWorker.addEventListener('message', ev => {
        const d = ev.data; if(!d || typeof d !== 'object') return;
        if(d.corre === 'ir' && typeof d.url === 'string'){
          let u = null; try{ u = new URL(d.url, location.href); }catch(e){ return; }
          if(u.origin !== location.origin) return;
          const h = u.hash && /^#\/[^\s<>"]*$/.test(u.hash) ? u.hash : '#/';
          C.closeSheet();
          if(location.hash === h) C.refresh(); else location.hash = h;
        }else if(d.corre === 'push'){
          if(d.t === 'msg'){ if(C.msg) C.msg.sync(true); }
          /* v4.16: chegou pedido com o Corre aberto: o Hórus relê (a Entrada e o número da aba) */
          else if(d.t === 'pedido'){ if(C.horusFunil) C.horusFunil.chegou(); }
          else if(C.avisos) C.avisos.sync(true);
        }else if(d.corre === 'push-sync') sync(true);
      });
    }catch(e){}
  }

  Object.assign(C.acts, {
    'push-ajustes': () => abrir(),
    'push-ligar': () => ligar(),
    'push-desligar': () => desligar(),
    'push-confere': () => { P.on = ligadoAqui(C.uid()); pinta(); if(estado() === 'desligado') ligar(); },
    'push-teste': async el => {
      if(!real()){ C.toast('Na demonstração o teste fica aqui: "Aviso de teste: tá chegando certinho."', 3600); return; }
      el.disabled = true;
      try{
        let ep = null; try{ const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription(); ep = sub ? sub.endpoint : null; }catch(e){}
        const r = await C.api.fn('push', { acao: 'teste', endpoint: ep }, true);
        C.toast(r && r.ok ? 'Mandado. Chega em alguns segundos.' : 'O serviço de avisos não aceitou. Desliga e liga de novo.', 3600);
      }catch(e){ C.toast(e && e.code === 'devagar' ? 'Um teste por minuto. Espera um pouquinho.' : e && e.code === 'sem_aparelho' ? 'Este aparelho não tá ligado. Desliga e liga de novo.' : erroTxt(e), 4200); }
      finally{ el.disabled = false; }
    },
    /* v4.06: o lembrete que a pessoa receberia agora (ou um de exemplo, se não tem novidade), só nos aparelhos dela */
    'push-lembra-teste': async el => {
      if(!real()){ C.toast('Na demonstração o lembrete fica aqui: "5 visitas no teu link na bio. Nos últimos 7 dias. Toca pra ver."', 4600); return; }
      el.disabled = true;
      try{
        const r = await C.api.fn('push', { acao: 'lembrete-teste' }, true);
        C.toast(r && r.ok ? 'Mandado. O lembrete chega em alguns segundos.' : 'O serviço de avisos não aceitou. Desliga e liga de novo.', 3800);
      }catch(e){ C.toast(e && e.code === 'devagar' ? 'Um exemplo por minuto. Espera um pouquinho.' : e && e.code === 'sem_aparelho' ? 'Nenhum aparelho teu tá ligado. Desliga e liga de novo.' : e && e.code === 'banco' ? 'Os lembretes ainda tão chegando no Corre.' : erroTxt(e), 4200); }
      finally{ el.disabled = false; }
    },
    'push-tipo': async el => {
      const k = el.dataset.k, v = !!el.checked;
      try{ P.ajustes = Object.assign({}, P.ajustes, await C.api.rpc('corre_push_ajusta', { p_campo: k, p_valor: v })); }
      catch(e){ el.checked = !v; C.toast(semBanco(e) || (k === 'lembra' && e && e.hint === 'campo') ? 'Os avisos no celular ainda tão chegando no Corre.' : C.errMsg(e)); }
      if(k === 'lembra'){ const ex = document.querySelector('#sheet .psh-ex'); if(ex) ex.hidden = !el.checked; }
    },
    'push-faixa-x': el => { ls.set(K_FX + (el.dataset.onde || ''), String(Date.now())); const f = el.closest('.psh-faixa'); if(f) f.remove(); }
  });

  /* v4.06: tem aparelho ligado (este ou outro)? null = o banco ainda não tem os avisos */
  async function temAparelho(){
    const u = C.uid(); if(!u) return null;
    if(ligadoAqui(u)) return true;
    try{ const a = await C.api.rpc('corre_push_ajustes', { p_endpoint: null }); return a ? (Number(a.aparelhos) || 0) > 0 : null; }catch(e){ return null; }
  }

  C.push = { estado, abrir, ligar, desligar, sair, sync, avisa, badge, faixa, temAparelho, log: () => P.log.slice(), instalado, IOS };
})();
