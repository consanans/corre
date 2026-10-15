/* CORRE · MENSAGENS. Conversa 1 a 1 entre perfis, ao vivo.
   Quem você segue cai direto na caixa; quem você não segue chega em Pedidos (e só vê que você leu depois que você aceita).
   Texto, foto (balde privado, abre por link assinado) e post ou perfil do Corre como cartão. Visto, digitando e "aqui agora".
   Bloquear vale pro Corre todo: é o mesmo bloqueio da cidade. As regras moram no banco (supabase/delta-v334.sql). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C, ST = window.CorreStickers;
  const M = { caixa: null, aba: 'conversas', badge: { n: 0, conversas: 0, pedidos: 0 }, badgeAt: 0, semBanco: false,
    conv: null, msgs: [], fim: false, novasDe: null, refs: { post: {}, perfil: {} }, fotos: {}, sala: null, salaSai: null,
    ouvir: null, ouvirDe: null, digAte: 0, digEnv: 0, aqui: false, envios: 0, lidaT: 0, caixaT: 0, antes: false, autores: {}, bloq: null };
  /* papo de grupo (v3.36): a conversa é do grupo; cada bolha dos outros leva o nome de quem falou */
  const ehG = c => !!c && c.tipo === 'grupo';
  const gAv = (g, t) => C.grupos ? C.grupos.av(g || {}, t) : '';
  const nMemb = g => { const n = Number((g || {}).membros_n) || 0; return `${n} ${n === 1 ? 'membro' : 'membros'}`; };
  const uid = () => C.uid();
  const rpc = (n, a) => C.api.rpc(n, a || {});
  const TZ = 'America/Sao_Paulo', MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const ms = t => Date.parse(t) || 0;

  /* ---------- erros em português de gente ---------- */
  const semBanco = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|function .* does not exist/i.test(e.message || ''));
  const ERROS = { nao_recebe: 'Essa pessoa não tá recebendo tuas mensagens.', voce_bloqueou: 'Você bloqueou essa pessoa. Desbloqueia pra mandar.',
    espera_aceitar: 'Já foram 5 mensagens. Agora espera a pessoa aceitar a conversa.', devagar: 'Muita mensagem em pouco tempo. Espera um minutinho.',
    limite_conversas: 'Chegou no limite de conversas novas de hoje.', perfil: 'Esse perfil não tá na vitrine.', eu: 'Essa conversa seria contigo mesmo.',
    vazia: 'Escreve alguma coisa.', texto: 'Mensagem grande demais: vai até 2.000 letras.', midia: 'A foto não subiu direito. Tenta de novo.',
    conversa: 'Essa conversa não tá mais aqui.', mensagem: 'Essa mensagem não é tua.', fora: 'Entra no grupo pra conversar.', grupo: 'Esse grupo não tá mais aqui.' };
  const erroTxt = (e, f) => { const h = (e && (e.hint || e.message)) || ''; return ERROS[h] || (semBanco(e) ? 'As mensagens ainda tão chegando no Corre.' : C.errMsg(e, f)); };

  /* ---------- horas e dias ---------- */
  const hora = t => { try{ return new Date(t).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); }catch(e){ return ''; } };
  const diaK = t => { try{ return new Date(t).toLocaleDateString('en-CA', { timeZone: TZ }); }catch(e){ return String(t).slice(0, 10); } };
  function diaRot(t){
    const k = diaK(t);
    if(k === diaK(Date.now())) return 'Hoje';
    if(k === diaK(Date.now() - 864e5)) return 'Ontem';
    const [y, m, d] = k.split('-').map(Number);
    return `${d} de ${MES[m - 1]}${y !== Number(diaK(Date.now()).slice(0, 4)) ? ' de ' + y : ''}`;
  }
  /* v3.55: o @ vira link só fora dos links (dentro do href ele quebrava a marcação: "http://a.co/(@abc" ) */
  const linka = t => esc(t).split(/\b(https?:\/\/[^\s<]{4,200})/g).map((s, i) => i % 2 ? `<a href="${s}" target="_blank" rel="noopener nofollow">${s}</a>`
    : s.replace(/(^|[\s(])@([a-z0-9_.]{3,24})/gi, (m, a, h) => { const k = h.replace(/\.+$/, ''); return k.length < 3 ? m : `${a}<a href="#/@${k.toLowerCase()}">@${k}</a>${h.slice(k.length)}`; })).join('');
  const monstra = () => ST ? `<span class="msg-stk" aria-hidden="true">${ST.svg('monstra')}</span>` : '';

  /* ---------- o número do topo e o ouvido ligado ---------- */
  const botao = () => `<a class="msg-btn" id="msg-btn" href="#/msg" aria-label="Mensagens" title="Mensagens">${ico('send')}<span class="msg-n num" hidden></span></a>`;
  /* v3.38: as Mensagens aparecem no menu do computador e na barra do celular; os dois ganham o número */
  function pintaBadge(){
    const bs = document.querySelectorAll('[data-msg], #msg-btn'); if(!bs.length) return;
    const n = Number(M.badge.n) || 0, p = Number(M.badge.pedidos) || 0;
    const ps = [n ? `${n} ${n === 1 ? 'não lida' : 'não lidas'}` : '', p ? `${p} ${p === 1 ? 'pedido novo' : 'pedidos novos'}` : ''].filter(Boolean);
    bs.forEach(b => {
      const s = b.querySelector('.msg-n'); if(!s) return;
      s.textContent = n ? (n > 99 ? '99+' : String(n)) : ''; s.hidden = !n && !p; s.classList.toggle('ponto', !n && !!p);
      b.setAttribute('aria-label', 'Mensagens' + (ps.length ? ': ' + ps.join(', ') : ''));
    });
    /* o número no ícone do app (celular com o Corre instalado) acompanha */
    if(C.push) C.push.badge(n + p);
  }
  async function sync(forca){
    if(!uid() || !C.st.me){ esquece(); return; }
    liga();
    if(!forca && Date.now() - M.badgeAt < 30e3){ pintaBadge(); return; }
    M.badgeAt = Date.now();
    try{ M.badge = Object.assign({ n: 0, conversas: 0, pedidos: 0 }, await rpc('corre_msg_badge')); M.semBanco = false; }
    catch(e){ if(semBanco(e)) M.semBanco = true; }
    pintaBadge();
  }
  function liga(){
    const u = uid(); if(!C.api.msg || !u || M.ouvirDe === u) return;
    para(); M.ouvirDe = u; M.ouvir = C.api.msg.ouve(chegou);
  }
  function para(){ if(M.ouvir){ try{ M.ouvir(); }catch(e){} } M.ouvir = null; M.ouvirDe = null; }
  /* v3.55: sair da conta esquece a caixa, os bloqueados e o contador (a próxima conta no mesmo aparelho não vê os da anterior) */
  function esquece(){ para(); M.caixa = null; M.bloq = null; M.badge = { n: 0, conversas: 0, pedidos: 0 }; M.badgeAt = 0; M.autores = {}; }

  /* mensagem nova (ou apagada) chegou pelo tempo real */
  function chegou(tipo, m){
    if(!m || !m.conversa) return;
    const me = uid(), aqui = M.conv && m.conversa === M.conv.conversa;
    if(tipo === 'upd'){
      if(aqui){ const i = M.msgs.findIndex(x => x.id === m.id); if(i >= 0){ M.msgs[i] = Object.assign({}, M.msgs[i], m); pintaBolhas(); } }
      agendaCaixa(); return;
    }
    if(aqui && ehG(M.conv) && M.bloq && M.bloq.has(m.dono)) return;
    if(aqui){
      if(M.msgs.some(x => x.id === m.id)) return;
      /* a minha que eu acabei de mandar volta pelo tempo real antes da resposta: quem troca o rascunho é o envio */
      if(m.dono === me && M.msgs.some(x => x.tmp && !x.falhou)) return;
      const fim = pertoDoFim();
      M.msgs.push(m); pintaBolhas();
      if(fim || m.dono === me) rolaFim(true); else { const b = C.$('msg-novas'); if(b) b.hidden = false; }
      if(m.dono !== me){
        M.digAte = 0; pintaDig(); marcaLida();
        /* respondeu = leu e (se tava nos Pedidos dela) aceitou */
        const ele = M.conv.ele; if(!ele.lida_em || ms(m.created_at) > ms(ele.lida_em)) ele.lida_em = m.created_at;
        if(ele.estado === 'pedido'){ ele.estado = 'aceita'; atualizaTrava(); pintaBolhas(); }
      }
      extras([m]);
    }
    if(m.dono !== me) agendaCaixa(aqui ? null : m.conversa);
  }
  /* a caixa e o número do topo se atualizam juntos (e avisam quem chegou, se não é a conversa aberta) */
  function agendaCaixa(avisar){
    clearTimeout(M.caixaT);
    M.caixaT = setTimeout(async () => {
      sync(true);
      if(!C.$('msg-lista') && !avisar) return;
      await carregaCaixa(); pintaCaixa();
      if(!avisar || document.visibilityState !== 'visible' || /^#\/msg\/?$/.test(location.hash)) return;
      const it = (M.caixa || []).find(x => x.id === avisar); if(!it || it.silenciada || it.bloqueei) return;
      C.toast(it.tipo === 'grupo' ? `${(it.grupo || {}).nome || 'Grupo'} · ${String(it.ultima_txt || '').slice(0, 70)}` : it.estado === 'pedido' ? `Pedido de mensagem de @${it.outro.handle}.` : `@${it.outro.handle}: ${String(it.ultima_txt || '').slice(0, 70)}`, 3600);
    }, 450);
  }

  /* ---------- a caixa ---------- */
  async function carregaCaixa(){
    try{ M.caixa = (await rpc('corre_msg_caixa', { p_lim: 100 })) || []; M.semBanco = false; }
    catch(e){ if(semBanco(e)) M.semBanco = true; M.caixa = M.caixa || []; }
    return M.caixa;
  }
  const caixaCasca = () => `<div class="msg-cx-h"><h1 class="msg-t">Mensagens</h1><button type="button" class="cbtn" data-act="msg-nova" aria-label="Nova mensagem" title="Nova mensagem">${ico('edit')}</button></div>
    <div class="msg-abas" role="tablist" aria-label="Caixa">
      <button type="button" role="tab" class="msg-aba" data-act="msg-aba" data-a="conversas" aria-selected="${M.aba !== 'pedidos'}">Conversas</button>
      <button type="button" role="tab" class="msg-aba" data-act="msg-aba" data-a="pedidos" aria-selected="${M.aba === 'pedidos'}">Pedidos<span class="msg-aba-n num" id="msg-aba-n" hidden></span></button>
    </div>
    ${C.push ? C.push.faixa('msg') : ''}
    <ul class="msg-lista" id="msg-lista"><li class="msg-vazio">Carregando…</li></ul>`;
  function itemHTML(x){
    const o = x.outro || {}, on = M.conv && M.conv.conversa === x.id, n = Number(x.nao_lidas) || 0;
    if(x.tipo === 'grupo'){
      const g = x.grupo || {}, ult = x.minha ? 'Você: ' + String(x.ultima_txt || '').replace(/^[^:]{1,40}:\s*/, '') : String(x.ultima_txt || '');
      return `<li><a class="msg-it grupo${n ? ' nova' : ''}${on ? ' on' : ''}" href="#/msg/g/${esc(g.slug || '')}">${gAv(g, 'm')}
        <span class="msg-it-tx"><span class="msg-it-top"><b>${esc(g.nome || 'Grupo')}</b><time datetime="${esc(x.ultima_em || '')}">${x.ultima_em ? C.rel(x.ultima_em) : ''}</time></span>
        <span class="msg-it-ult">${x.silenciada ? ico('micoff') : ''}${esc(ult)}</span></span>
        ${n ? `<span class="msg-it-n num" aria-label="${n} não ${n === 1 ? 'lida' : 'lidas'}">${n > 99 ? '99+' : n}</span>` : ''}</a></li>`;
    }
    const st = x.bloqueei ? 'bloqueado' : x.minha && x.ele_estado === 'pedido' ? 'esperando aceitar' : '';
    return `<li><a class="msg-it${n ? ' nova' : ''}${on ? ' on' : ''}" href="#/msg/@${esc(o.handle || '')}">${C.avatar(o, 'm')}
      <span class="msg-it-tx"><span class="msg-it-top"><b>${esc(o.nome || '@' + (o.handle || ''))}</b><time datetime="${esc(x.ultima_em || '')}">${x.ultima_em ? C.rel(x.ultima_em) : ''}</time></span>
      <span class="msg-it-ult">${x.silenciada ? ico('micoff') : ''}${st ? `<em>${st}</em> · ` : ''}${esc((x.minha ? 'Você: ' : '') + (x.ultima_txt || ''))}</span></span>
      ${n ? `<span class="msg-it-n num" aria-label="${n} não ${n === 1 ? 'lida' : 'lidas'}">${n > 99 ? '99+' : n}</span>` : ''}</a></li>`;
  }
  function pintaCaixa(){
    document.querySelectorAll('.msg-aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.a === M.aba)));
    const ul = C.$('msg-lista'); if(!ul) return;
    const L = M.caixa, ped = (L || []).filter(x => x.estado === 'pedido'), an = C.$('msg-aba-n');
    if(an){ an.textContent = ped.length; an.hidden = !ped.length; }
    if(M.semBanco){ ul.innerHTML = `<li class="msg-vazio">${monstra()}<b>As mensagens tão chegando.</b><span>Falta atualizar o banco do Corre (delta v3.34). Assim que rodar, a caixa abre aqui.</span></li>`; return; }
    if(!L){ ul.innerHTML = '<li class="msg-vazio">Carregando…</li>'; return; }
    const vis = L.filter(x => M.aba === 'pedidos' ? x.estado === 'pedido' : x.estado === 'aceita');
    if(vis.length){ ul.innerHTML = vis.map(itemHTML).join(''); return; }
    ul.innerHTML = M.aba === 'pedidos'
      ? `<li class="msg-vazio"><b>Nenhum pedido.</b><span>Mensagem de quem você não segue chega aqui primeiro. Você aceita se quiser.</span></li>`
      : `<li class="msg-vazio">${monstra()}<b>Nenhuma conversa ainda.</b><span>Chama alguém pelo perfil, ou procura aqui.</span><button type="button" class="btn pri sm" data-act="msg-nova">${ico('send')} Nova mensagem</button>${ped.length ? `<button type="button" class="lnk" data-act="msg-aba" data-a="pedidos">${ped.length === 1 ? 'Tem 1 pedido esperando' : `Tem ${ped.length} pedidos esperando`}</button>` : ''}</li>`;
  }

  /* ---------- a página: #/msg, #/msg/pedidos, #/msg/@fulano ---------- */
  C.views.msg = async function(app, resto){
    resto = decodeURIComponent(String(resto || '')).replace(/^\/+/, '');
    const gs = resto.startsWith('g/') ? resto.slice(2).toLowerCase().replace(/[^a-z0-9-]/g, '') : '';
    const h = !gs && resto.startsWith('@') ? resto.slice(1).toLowerCase().replace(/[^a-z0-9_.]/g, '') : '';
    if(resto === 'pedidos') M.aba = 'pedidos'; else if(!h) M.aba = 'conversas';
    fechaConversa();
    document.title = 'Mensagens · Corre';
    app.innerHTML = C.header('msg') + `<main class="wrap msg-pg${h || gs ? ' com-conversa' : ''}" id="msg-pg">
      <section class="msg-caixa" aria-label="Tuas conversas">${caixaCasca()}</section>
      <section class="msg-conv" id="msg-conv" aria-label="Conversa">${h || gs ? '<p class="msg-carrega">Abrindo a conversa…</p>' : `<div class="msg-nada">${monstra()}<b>Escolhe uma conversa</b><span>ou começa uma nova.</span><button type="button" class="btn pri" data-act="msg-nova">${ico('send')} Nova mensagem</button></div>`}</section>
    </main>`;
    if(h || gs){ document.body.classList.add('msg-aberta'); ajustaTela(); }
    const rota = C.rota;
    if(M.caixa) pintaCaixa();
    carregaCaixa().then(() => { if(rota === C.rota) pintaCaixa(); });
    sync(true);
    if(gs) await abreGrupo(gs, rota);
    else if(h) await abreConversa(h, rota);
  };

  /* ---------- a conversa ---------- */
  async function abreConversa(h, rota){
    let r = null;
    try{ r = await rpc('corre_msg_abrir', { p_handle: h }); }
    catch(e){
      if(rota !== C.rota) return;
      const el = C.$('msg-conv'); if(el) el.innerHTML = `<div class="msg-nada">${monstra()}<b>${esc(erroTxt(e, 'Não deu pra abrir essa conversa.'))}</b><a class="btn" href="#/msg">Voltar pras conversas</a></div>`;
      return;
    }
    if(rota !== C.rota || !r) return;
    r.tipo = 'dm';
    await entraConversa(r, rota);
  }
  /* o papo de um grupo (só quem tá dentro) */
  async function abreGrupo(slug, rota){
    let r = null;
    try{ r = await rpc('corre_grupo_papo', { p_slug: slug }); }
    catch(e){
      if(rota !== C.rota) return;
      const el = C.$('msg-conv'); if(el) el.innerHTML = `<div class="msg-nada">${monstra()}<b>${esc(erroTxt(e, 'Não deu pra abrir o papo do grupo.'))}</b><a class="btn" href="#/g/${esc(slug)}">Ver o grupo</a></div>`;
      return;
    }
    if(rota !== C.rota || !r) return;
    if(!M.bloq){ try{ M.bloq = new Set((await C.api.q('corre_verso_bloq', { eq: { dono: uid() } })).map(b => b.quem)); }catch(e){ M.bloq = new Set(); } }
    r.tipo = 'grupo';
    await entraConversa(r, rota);
  }
  async function entraConversa(r, rota){
    M.conv = r; M.msgs = []; M.fim = false; M.digAte = 0; M.aqui = false; M.novasDe = r.eu && r.eu.lida_em;
    M.aba = r.eu && r.eu.estado === 'pedido' ? 'pedidos' : 'conversas';
    document.title = `${ehG(r) ? r.grupo.nome : r.outro.nome || '@' + r.outro.handle} · Mensagens · Corre`;
    pintaConversa();
    let L = [];
    try{ L = (await rpc('corre_msg_lista', { p_conversa: r.conversa, p_lim: 50 })) || []; }catch(e){ L = []; }
    if(rota !== C.rota || !M.conv || M.conv.conversa !== r.conversa) return;
    M.msgs = L.slice().reverse(); M.fim = L.length < 50;
    /* a linha "Novas" separa o que já tinha lido do que chegou depois (conversa toda nova não precisa dela) */
    const lida = ms(M.novasDe);
    if(!lida || !M.msgs.some(m => ms(m.created_at) <= lida) || !M.msgs.some(m => m.dono !== uid() && ms(m.created_at) > lida)) M.novasDe = null;
    pintaBolhas(); rolaFim(true);
    extras(M.msgs);
    abreSala();
    marcaLida();
    pintaCaixa();
  }
  function avisoHTML(){
    const c = M.conv; if(ehG(c)) return '';
    const o = c.outro, h = '@' + esc(o.handle);
    if(c.bloqueei) return `<div class="msg-av"><p>Você bloqueou ${h}. Ninguém manda nada pra ninguém, aqui e na cidade.</p><div class="acts"><button type="button" class="btn sm" data-act="msg-bloq" data-on="1">Desbloquear</button></div></div>`;
    if(c.eu.estado === 'pedido') return `<div class="msg-av"><p><b>${h} quer conversar.</b> Você não segue ${h}: a pessoa só vê que você leu depois que você aceitar.</p><div class="acts"><button type="button" class="btn sm pri" data-act="msg-estado" data-a="aceitar">Aceitar</button><button type="button" class="btn sm" data-act="msg-estado" data-a="recusar">Recusar</button><button type="button" class="btn sm ghost" data-act="msg-bloq">Bloquear</button></div></div>`;
    if(c.eu.estado === 'recusada') return `<div class="msg-av"><p>Você recusou essa conversa: ${h} não consegue te mandar mensagem.</p><div class="acts"><button type="button" class="btn sm" data-act="msg-estado" data-a="aceitar">Aceitar a conversa</button></div></div>`;
    if(c.ele.estado === 'recusada') return `<p class="msg-av leve">${h} não tá recebendo mensagens tuas.</p>`;
    if(c.ele.estado === 'pedido') return `<p class="msg-av leve">Tua mensagem chega nos Pedidos de ${h}. Quando aceitar ou responder, vira conversa.</p>`;
    return '';
  }
  /* o que trava o campo de escrever (e por quê) */
  function travado(){
    const c = M.conv; if(!c) return 'Conversa fechada';
    if(ehG(c)) return '';
    if(c.bloqueei) return 'Você bloqueou essa pessoa';
    if(c.eu.estado === 'recusada' || c.ele.estado === 'recusada') return 'Conversa fechada';
    if(c.ele.estado === 'pedido' && M.msgs.filter(m => m.dono === uid() && !m.tmp).length >= 5) return 'Espera a pessoa aceitar';
    return '';
  }
  function pintaConversa(){
    const el = C.$('msg-conv'), c = M.conv; if(!el || !c) return;
    const o = c.outro || {}, tr = travado(), g = ehG(c) ? c.grupo : null;
    el.innerHTML = `<header class="msg-ch${g ? ' grupo' : ''}">
        <a class="msg-volta cbtn plain" href="#/msg" aria-label="Voltar pras conversas">${ico('prev')}</a>
        ${g ? `<a class="msg-quem" href="#/g/${esc(g.slug)}">${gAv(g, 's')}<span><b>${esc(g.nome)}</b><small id="msg-st">${nMemb(g)}</small></span></a>`
          : `<a class="msg-quem" href="#/@${esc(o.handle)}">${C.avatar(o, 's')}<span><b>${esc(o.nome || '@' + o.handle)}</b><small id="msg-st">@${esc(o.handle)}</small></span></a>`}
        <button type="button" class="cbtn plain" data-act="msg-menu" aria-label="Opções da conversa">${ico('dots')}</button>
      </header>
      <div id="msg-aviso">${avisoHTML()}</div>
      <div class="msg-rolo" id="msg-rolo">
        <div class="msg-antes-w"><button type="button" class="lnk msg-antes" id="msg-antes" data-act="msg-antes" hidden>Mensagens anteriores</button></div>
        <ol class="msg-bolhas" id="msg-bolhas" aria-live="polite" aria-label="${g ? `Papo de ${esc(g.nome)}` : `Mensagens com @${esc(o.handle)}`}"></ol>
        <p class="msg-dig" id="msg-dig" hidden><span></span><span></span><span></span><em>digitando</em></p>
      </div>
      <button type="button" class="msg-novas" id="msg-novas" data-act="msg-fim" hidden>${ico('down')} Mensagem nova</button>
      <form class="msg-comp" id="msg-comp" autocomplete="off">
        <label class="cbtn msg-foto up-lbl${tr ? ' off' : ''}" title="Mandar foto">${ico('camera')}<input type="file" accept="image/*" id="msg-file" aria-label="Mandar foto"${tr ? ' disabled' : ''}></label>
        <textarea class="inp msg-campo" id="msg-txt" rows="1" maxlength="2000" placeholder="${esc(tr || (g ? 'Mensagem pro grupo' : 'Mensagem'))}" aria-label="${g ? `Mensagem pro grupo ${esc(g.nome)}` : `Mensagem pra @${esc(o.handle)}`}"${tr ? ' disabled' : ''}></textarea>
        <button type="submit" class="cbtn msg-env" id="msg-env" aria-label="Enviar"${tr ? ' disabled' : ''}>${ico('send')}</button>
      </form>`;
    const ta = C.$('msg-txt'), rolo = C.$('msg-rolo'), grosso = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const cresce = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 140) + 'px'; };
    ta.addEventListener('input', () => {
      cresce();
      if(M.sala && ta.value.trim() && Date.now() - M.digEnv > 2500){ M.digEnv = Date.now(); M.sala.envia('dig', {}); }
    });
    ta.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing && !grosso()){ e.preventDefault(); C.$('msg-comp').requestSubmit ? C.$('msg-comp').requestSubmit() : envia(); } });
    C.$('msg-comp').addEventListener('submit', e => { e.preventDefault(); envia(); });
    C.$('msg-file').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
      if(f.type && !/^image\//.test(f.type)){ C.toast('Isso não é uma foto.'); return; }
      manda({ arquivo: f, previa: URL.createObjectURL(f) });
    });
    rolo.addEventListener('scroll', () => {
      if(rolo.scrollTop < 60 && !M.fim) carregaAntes();
      if(pertoDoFim()){ const b = C.$('msg-novas'); if(b) b.hidden = true; }
    }, { passive: true });
    pintaStatus();
    if(!grosso() && !tr) setTimeout(() => { try{ ta.focus({ preventScroll: true }); }catch(e){} }, 60);
  }
  /* o aviso de cima e a trava do campo mudam com o estado (aceitou, recusou, bloqueou, 5 nos Pedidos) */
  function atualizaTrava(){
    if(!M.conv) return;
    const tr = travado(), av = C.$('msg-aviso'), ta = C.$('msg-txt'), f = document.querySelector('.msg-foto');
    if(av) av.innerHTML = avisoHTML();
    ['msg-txt', 'msg-env', 'msg-file'].forEach(id => { const e = C.$(id); if(e) e.disabled = !!tr; });
    if(ta) ta.placeholder = tr || 'Mensagem';
    if(f) f.classList.toggle('off', !!tr);
  }
  function envia(){
    const ta = C.$('msg-txt'); if(!ta || ta.disabled) return;
    const t = ta.value.trim(); if(!t) return;
    ta.value = ''; ta.style.height = 'auto';
    manda({ texto: t });
    try{ ta.focus({ preventScroll: true }); }catch(e){}
  }
  /* manda já aparecendo (rascunho) e troca pela de verdade quando o banco confirma */
  async function manda(o){
    const c = M.conv; if(!c) return;
    const me = uid(), tmp = { id: 'tmp-' + (++M.envios), dono: me, texto: o.texto || '', midia: o.previa || '', ref: o.ref || null, created_at: new Date().toISOString(), tmp: true, o };
    M.msgs.push(tmp); pintaBolhas(); rolaFim(true);
    try{
      let midia = '';
      if(o.arquivo){ const blob = await C.shrink(o.arquivo, 1600, .84); midia = await C.api.msg.sobe(blob, c.conversa); }
      const m = await rpc('corre_msg_enviar', { p_conversa: c.conversa, p_texto: o.texto || '', p_midia: midia, p_ref: o.ref || null });
      if(C.push && m && m.id) C.push.avisa('msg', m.id);
      if(!M.conv || M.conv.conversa !== c.conversa) return;
      if(o.previa && m.midia) M.fotos[m.midia] = o.previa;
      const i = M.msgs.indexOf(tmp);
      if(M.msgs.some(x => x.id === m.id)){ if(i >= 0) M.msgs.splice(i, 1); } else if(i >= 0) M.msgs[i] = m; else M.msgs.push(m);
      if(c.eu.estado === 'pedido'){ c.eu.estado = 'aceita'; M.aba = 'conversas'; }
      pintaBolhas(); rolaFim(true);
      const it = (M.caixa || []).find(x => x.id === c.conversa);
      if(it){ const pv = m.texto ? m.texto.slice(0, 120) : m.midia ? 'Foto' : m.ref && m.ref.tipo === 'post' ? 'Post' : 'Perfil'; Object.assign(it, { ultima_em: m.created_at, ultima_txt: ehG(c) ? `${C.firstName((C.st.me || {}).nome) || 'Você'}: ${pv}` : pv, minha: true, estado: 'aceita' }); M.caixa.sort((a, b) => ms(b.ultima_em) - ms(a.ultima_em)); pintaCaixa(); }
      else carregaCaixa().then(pintaCaixa);
      M.novasDe = null;
      atualizaTrava();
    }catch(e){
      tmp.falhou = erroTxt(e, 'Não foi.'); pintaBolhas();
      if(e && (e.hint === 'nao_recebe' || e.hint === 'espera_aceitar' || e.hint === 'voce_bloqueou')) C.toast(tmp.falhou, 4200);
    }
  }

  /* ---------- as bolhas ---------- */
  function fotoHTML(m){
    const src = /^(data:|blob:)/.test(m.midia) ? m.midia : (M.fotos[m.midia] || '');
    return `<button type="button" class="msg-foto-b" data-act="msg-ver-foto" data-id="${esc(m.id)}" aria-label="Abrir foto">${src ? `<img src="${esc(src)}" alt="Foto">` : '<span class="msg-foto-c">Foto</span>'}</button>`;
  }
  function refHTML(r){
    if(!r || typeof r !== 'object') return '';
    if(r.tipo === 'post'){
      const p = M.refs.post[r.id];
      if(p === null) return `<div class="msg-ref off">Esse post não tá mais disponível.</div>`;
      if(!p) return `<a class="msg-ref carregando" href="#/p/${esc(r.id)}">Post do Corre</a>`;
      const a = p.perfil || {}, img = p.midia_url || (p.tipo === 'rolo' && p.ref && p.ref.src) || '';
      return `<a class="msg-ref" href="#/p/${esc(p.id)}"><span class="msg-ref-h">${C.avatar(a, 's')}<b>${esc(a.nome || '')}</b><small>@${esc(a.handle || '')}</small></span>${p.texto ? `<span class="msg-ref-t">${esc(String(p.texto).slice(0, 240))}</span>` : ''}${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</a>`;
    }
    if(r.tipo === 'perfil'){
      const p = M.refs.perfil[r.handle];
      if(p === null) return `<div class="msg-ref off">Esse perfil não tá na vitrine.</div>`;
      if(!p) return `<a class="msg-ref carregando" href="#/@${esc(r.handle)}">@${esc(r.handle)}</a>`;
      return `<a class="msg-ref perfil" href="#/@${esc(p.handle)}">${C.avatar(p, 'm')}<span><b>${esc(p.nome || '')}</b><small>@${esc(p.handle)}${p.faz ? ' · ' + esc(p.faz) : ''}</small></span><span class="msg-ref-cta">Ver perfil ${ico('next')}</span></a>`;
    }
    return '';
  }
  function autorHTML(id){
    const p = M.autores[id];
    return `<span class="msg-autor">${p ? `<a href="#/@${esc(p.handle)}">${C.avatar(p, 's')}<b>${esc(p.nome || '@' + p.handle)}</b></a>` : `${C.avatar({ nome: '?' }, 's')}<b>${p === null ? 'Perfil mocado' : '…'}</b>`}</span>`;
  }
  function bolhaHTML(m, eu, junto, fecha, autor){
    const cls = ['msg-b', eu ? 'eu' : 'ele', junto ? 'junto' : '', m.tmp && !m.falhou ? 'enviando' : '', m.falhou ? 'falhou' : '', m.apagada ? 'apagada' : ''].filter(Boolean).join(' ');
    let corpo = '';
    if(m.apagada) corpo = '<p class="msg-tx"><i>Mensagem apagada</i></p>';
    else{
      if(m.midia) corpo += fotoHTML(m);
      if(m.ref) corpo += refHTML(m.ref);
      if(m.texto) corpo += `<p class="msg-tx">${linka(m.texto)}</p>`;
    }
    const pe = m.falhou ? `<button type="button" class="msg-erro" data-act="msg-reenvia" data-id="${esc(m.id)}">${esc(m.falhou)} Tentar de novo</button>`
      : fecha ? `<time datetime="${esc(m.created_at)}">${m.tmp ? 'enviando…' : hora(m.created_at)}</time>` : '';
    return `<li class="${cls}" id="mb-${esc(m.id)}">${autor || ''}<div class="msg-bolha${m.midia && !m.texto && !m.ref && !m.apagada ? ' so-foto' : ''}" data-act="msg-bolha" data-id="${esc(m.id)}">${corpo}</div>${pe}</li>`;
  }
  const junto = (a, b) => !!a && !!b && a.dono === b.dono && Math.abs(ms(b.created_at) - ms(a.created_at)) < 5 * 6e4 && diaK(a.created_at) === diaK(b.created_at);
  function pintaBolhas(){
    const ol = C.$('msg-bolhas'); if(!ol || !M.conv) return;
    const me = uid(), L = M.msgs, fim = pertoDoFim();
    let html = '', dia = '', novas = false;
    L.forEach((m, i) => {
      const k = diaK(m.created_at);
      if(k !== dia){ dia = k; html += `<li class="msg-dia"><span>${diaRot(m.created_at)}</span></li>`; }
      if(M.novasDe && !novas && m.dono !== me && !m.tmp && ms(m.created_at) > ms(M.novasDe)){ novas = true; html += '<li class="msg-novas-l"><span>Novas</span></li>'; }
      const jt = junto(L[i - 1], m);
      html += bolhaHTML(m, m.dono === me, jt, !junto(m, L[i + 1]), ehG(M.conv) && m.dono !== me && !jt ? autorHTML(m.dono) : '');
    });
    const ult = L[L.length - 1], ele = M.conv.ele || {};
    if(!ehG(M.conv)){
      if(ult && ult.dono === me && !ult.tmp && ele.lida_em && ms(ele.lida_em) >= ms(ult.created_at)) html += '<li class="msg-visto">Visto</li>';
      else if(ult && ult.dono === me && !ult.tmp && ele.estado === 'pedido') html += '<li class="msg-visto">Nos Pedidos</li>';
    }
    ol.innerHTML = html || zeroHTML();
    const ab = C.$('msg-antes'); if(ab) ab.hidden = M.fim || !L.length;
    if(fim) rolaFim(true);
  }
  /* conversa vazia: três jeitos de puxar assunto */
  function zeroHTML(){
    const c = M.conv;
    if(ehG(c)) return `<li class="msg-zero">${monstra()}<b>O papo de ${esc(c.grupo.nome)} tá quieto.</b><span>Manda o primeiro oi pro grupo: todo mundo que tá dentro vê.</span></li>`;
    const nm = C.firstName(c.outro.nome);
    if(travado()) return '';
    const sug = [`Oi, ${nm}! Vi teu perfil no Corre.`, 'Você faz orçamento?', 'Bora trocar uma ideia sobre um trampo?'];
    return `<li class="msg-zero">${monstra()}<b>Manda o primeiro oi pra @${esc(c.outro.handle)}.</b><span class="msg-sugs">${sug.map(t => `<button type="button" class="chip add" data-act="msg-sug" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</span></li>`;
  }
  function pintaDig(){
    const ativo = Date.now() < M.digAte, el = C.$('msg-dig');
    if(el){ const fim = pertoDoFim(); el.hidden = !ativo; if(ativo && fim) rolaFim(true); }
    pintaStatus();
  }
  function pintaStatus(){
    const el = C.$('msg-st'), c = M.conv; if(!el || !c) return;
    const dig = Date.now() < M.digAte;
    el.textContent = ehG(c) ? (dig ? 'alguém digitando…' : nMemb(c.grupo)) : dig ? 'digitando…' : M.aqui ? 'na conversa agora' : '@' + c.outro.handle;
    el.classList.toggle('vivo', dig || M.aqui);
  }
  const pertoDoFim = () => { const r = C.$('msg-rolo'); return !r || r.scrollHeight - r.scrollTop - r.clientHeight < 140; };
  function rolaFim(forca){ const r = C.$('msg-rolo'); if(!r) return; if(forca || pertoDoFim()) r.scrollTop = r.scrollHeight; const b = C.$('msg-novas'); if(b) b.hidden = true; }

  /* cartões (post e perfil) e fotos privadas (link assinado) */
  async function autores(L){
    if(!ehG(M.conv)) return false;
    const me = uid(), ids = [...new Set(L.map(m => m.dono).filter(id => id && id !== me && !(id in M.autores)))].slice(0, 60);
    if(!ids.length) return false;
    try{ const ps = await C.api.q('corre_perfis', { in: { id: ids } }); ids.forEach(id => { M.autores[id] = ps.find(p => p.id === id) || null; }); }catch(e){ return false; }
    return true;
  }
  async function extras(L){
    const posts = [...new Set(L.filter(m => m.ref && m.ref.tipo === 'post' && m.ref.id && !(m.ref.id in M.refs.post)).map(m => String(m.ref.id)))].slice(0, 40);
    const hs = [...new Set(L.filter(m => m.ref && m.ref.tipo === 'perfil' && m.ref.handle && !(m.ref.handle in M.refs.perfil)).map(m => String(m.ref.handle)))].slice(0, 40);
    const fotos = [...new Set(L.filter(m => m.midia && !/^(data:|blob:)/.test(m.midia) && !M.fotos[m.midia]).map(m => m.midia))];
    const ts = [];
    if(posts.length) ts.push(C.api.q('corre_feed', { join: 'perfil', in: { id: posts } }).then(rs => { posts.forEach(id => { M.refs.post[id] = rs.find(p => p.id === id) || null; }); }).catch(() => {}));
    if(hs.length) ts.push(C.api.q('corre_perfis', { in: { handle: hs } }).then(rs => { hs.forEach(h => { M.refs.perfil[h] = rs.find(p => p.handle === h) || null; }); }).catch(() => {}));
    if(fotos.length && C.api.msg) ts.push(C.api.msg.assina(fotos).then(o => { Object.assign(M.fotos, o); }).catch(() => {}));
    if(ehG(M.conv) && L.some(m => m.dono && m.dono !== uid() && !(m.dono in M.autores))) ts.push(autores(L));
    if(!ts.length) return;
    const fim = pertoDoFim(); await Promise.all(ts); pintaBolhas(); if(fim) rolaFim(true);
  }
  async function carregaAntes(){
    if(M.antes || M.fim || !M.conv) return;
    const velha = M.msgs.find(m => !m.tmp); if(!velha) return;
    M.antes = true;
    const rolo = C.$('msg-rolo'), h0 = rolo ? rolo.scrollHeight : 0, c = M.conv;
    try{
      const L = (await rpc('corre_msg_lista', { p_conversa: c.conversa, p_antes: velha.created_at, p_lim: 50 })) || [];
      if(!M.conv || M.conv.conversa !== c.conversa) return;
      M.msgs = L.slice().reverse().concat(M.msgs); M.fim = L.length < 50;
      pintaBolhas(); if(rolo) rolo.scrollTop = rolo.scrollHeight - h0 + rolo.scrollTop;
      extras(L);
    }catch(e){}finally{ M.antes = false; }
  }

  /* ---------- tempo real da conversa aberta: digitando, visto e quem tá aqui ---------- */
  function abreSala(){
    if(!C.api.msg || !M.conv) return;
    const id = M.conv.conversa;
    const vai = () => {
      if(!M.conv || M.conv.conversa !== id || M.sala) return;
      M.sala = C.api.msg.sala(id, {
        dig: p => { if(p.u === uid() || !M.conv || M.conv.conversa !== id) return; M.digAte = Date.now() + 4000; pintaDig(); setTimeout(pintaDig, 4100); },
        li: p => { if(p.u === uid() || !M.conv || M.conv.conversa !== id) return; M.conv.ele.lida_em = p.em || new Date().toISOString(); pintaBolhas(); },
        aqui: ks => { if(!M.conv || M.conv.conversa !== id) return; M.aqui = !ehG(M.conv) && ks.includes(M.conv.outro.id); pintaStatus(); }
      });
    };
    if(M.salaSai) M.salaSai.then(vai); else vai();
  }
  function fechaConversa(){
    if(M.sala){ const s = M.sala; M.sala = null; M.salaSai = Promise.resolve(s.sai()).catch(() => {}).then(() => { M.salaSai = null; }); }
    M.conv = null; M.msgs = []; M.digAte = 0; M.aqui = false;
    document.body.classList.remove('msg-aberta');
  }
  /* li: só conta com a conversa aceita e a tela na frente */
  function marcaLida(){
    const c = M.conv; if(!c || c.eu.estado !== 'aceita' || document.visibilityState !== 'visible') return;
    clearTimeout(M.lidaT);
    M.lidaT = setTimeout(async () => {
      if(!M.conv || M.conv.conversa !== c.conversa) return;
      try{ const t = await rpc('corre_msg_lida', { p_conversa: c.conversa }); if(M.sala) M.sala.envia('li', { em: t }); }catch(e){ return; }
      const it = (M.caixa || []).find(x => x.id === c.conversa); if(it && it.nao_lidas){ it.nao_lidas = 0; pintaCaixa(); }
      sync(true);
    }, 400);
  }
  /* voltou pra aba: marca o que leu e, sem pressa (a cidade também se acerta nessa hora), confere o número do topo */
  let voltaT = 0;
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState !== 'visible') return;
    if(M.conv) marcaLida();
    clearTimeout(voltaT); voltaT = setTimeout(() => { if(uid()) sync(true); }, 2500);
  });
  addEventListener('hashchange', () => { if(!/^#\/msg(\/|$)/.test(location.hash)) fechaConversa(); });
  /* celular: a conversa ocupa a tela que sobra com o teclado aberto */
  function ajustaTela(){
    const vv = window.visualViewport, h = vv ? vv.height : innerHeight, t = vv ? vv.offsetTop : 0, r = document.documentElement.style;
    r.setProperty('--vvh', Math.round(h) + 'px'); r.setProperty('--vvt', Math.round(t) + 'px');
    if(document.body.classList.contains('msg-aberta') && pertoDoFim()) rolaFim(true);
  }
  if(window.visualViewport){ visualViewport.addEventListener('resize', ajustaTela); visualViewport.addEventListener('scroll', ajustaTela); }
  addEventListener('resize', ajustaTela);

  /* ---------- procurar gente (nova mensagem, mandar post ou perfil) ---------- */
  async function busca(q){
    q = String(q || '').trim().replace(/^@/, '').toLowerCase();
    const me = uid(), vistos = new Set([me]), out = [];
    const poe = p => { if(p && p.id && !vistos.has(p.id) && p.handle){ vistos.add(p.id); out.push(p); } };
    if(q.length < 2){
      if(!M.caixa) await carregaCaixa();
      (M.caixa || []).filter(x => x.estado === 'aceita' && !x.bloqueei).forEach(x => poe(x.outro));
      if(out.length < 10){
        try{
          const sg = await C.api.q('corre_seguindo', { eq: { quem: me }, limit: 60 });
          const ids = sg.map(s => s.segue).filter(id => !vistos.has(id)).slice(0, 30);
          if(ids.length) (await C.api.q('corre_perfis', { in: { id: ids } })).forEach(poe);
        }catch(e){}
      }
      return out.slice(0, 12);
    }
    const like = '%' + q.replace(/[%_\\]/g, '') + '%';
    const [a, b] = await Promise.all([
      C.api.q('corre_perfis', { ilike: { handle: like }, eq: { visibilidade: 'publico' }, limit: 12 }).catch(() => []),
      C.api.q('corre_perfis', { ilike: { nome: like }, eq: { visibilidade: 'publico' }, limit: 12 }).catch(() => [])
    ]);
    a.concat(b).forEach(poe);
    return out.slice(0, 12);
  }
  const pessoaHTML = (p, acao) => `<li class="msg-p">${C.avatar(p, 's')}<span><b>${esc(p.nome || '')}</b><small>@${esc(p.handle)}${p.faz ? ' · ' + esc(p.faz) : ''}</small></span>${acao}</li>`;
  function folhaBusca(titulo, extra, linha){
    const panel = C.sheet(`<div class="form msg-busca"><div class="sheet-head"><h2>${ico('send')} ${esc(titulo)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${extra || ''}<input class="inp" id="mb-q" type="search" placeholder="Procurar pessoa (nome ou @)" autocomplete="off" aria-label="Procurar pessoa">
      <ul class="msg-pessoas" id="mb-l"><li class="msg-vazio">Carregando…</li></ul></div>`);
    let t = 0, seq = 0;
    const lista = async () => {
      const s = ++seq, q = C.$('mb-q') ? C.$('mb-q').value : '', L = await busca(q), ul = C.$('mb-l');
      if(s !== seq || !ul) return;
      ul.innerHTML = L.length ? L.map(linha).join('') : `<li class="msg-vazio">${q.trim().length >= 2 ? 'Ninguém com esse nome na vitrine.' : 'Procura pelo nome ou pelo @.'}</li>`;
    };
    C.$('mb-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(lista, 220); });
    lista();
    return panel;
  }
  function nova(){
    if(!uid() || !C.st.me){ C.toast('Entra no Corre pra mandar mensagem.'); return; }
    folhaBusca('Nova mensagem', '', p => pessoaHTML(p, `<a class="btn sm pri" href="#/msg/@${esc(p.handle)}" data-close>Conversar</a>`));
  }
  /* mandar um post ou indicar um perfil pra alguém (vira cartão na conversa) */
  function mandar(ref, titulo){
    if(!uid() || !C.st.me){ C.toast('Entra no Corre pra mandar mensagem.'); return; }
    const panel = folhaBusca(titulo, '<textarea class="inp" id="mb-t" rows="2" maxlength="500" placeholder="Escreve alguma coisa (opcional)" aria-label="Recado junto"></textarea>',
      p => pessoaHTML(p, `<button type="button" class="btn sm pri" data-mm="${esc(p.handle)}">Mandar</button>`));
    panel.addEventListener('click', async e => {
      const b = e.target.closest('[data-mm]'); if(!b || b.disabled) return;
      b.disabled = true; b.textContent = 'Mandando…';
      try{
        const r = await rpc('corre_msg_abrir', { p_handle: b.dataset.mm });
        const t = (C.$('mb-t') && C.$('mb-t').value.trim()) || '';
        const m = await rpc('corre_msg_enviar', { p_conversa: r.conversa, p_texto: t, p_midia: '', p_ref: ref });
        if(C.push && m && m.id) C.push.avisa('msg', m.id);
        b.textContent = 'Mandado'; b.classList.remove('pri');
        carregaCaixa().then(pintaCaixa);
      }catch(err){ b.disabled = false; b.textContent = 'Mandar'; C.toast(erroTxt(err, 'Não deu pra mandar.'), 4000); }
    });
  }

  /* ---------- ações ---------- */
  const armar = (el, txt) => { if(el.dataset.armed === '1') return true; el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = esc(txt); return false; };
  Object.assign(C.acts, {
    'msg-nova': () => nova(),
    'msg-aba': el => { M.aba = el.dataset.a === 'pedidos' ? 'pedidos' : 'conversas'; pintaCaixa(); },
    'msg-fim': () => rolaFim(true),
    'msg-antes': () => carregaAntes(),
    'msg-sug': el => { const ta = C.$('msg-txt'); if(!ta) return; ta.value = el.dataset.t || ''; ta.dispatchEvent(new Event('input')); try{ ta.focus(); }catch(e){} },
    'msg-reenvia': el => { const i = M.msgs.findIndex(m => m.id === el.dataset.id); if(i < 0) return; const m = M.msgs[i]; M.msgs.splice(i, 1); pintaBolhas(); manda(m.o || { texto: m.texto }); },
    'msg-mandar': el => {
      if(el.dataset.k === 'post') mandar({ tipo: 'post', id: el.dataset.id }, 'Mandar o post');
      else if(el.dataset.k === 'perfil') mandar({ tipo: 'perfil', handle: el.dataset.h }, `Indicar @${el.dataset.h}`);
    },
    'msg-menu': () => {
      const c = M.conv; if(!c) return;
      if(ehG(c)){
        const g = c.grupo;
        C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>${esc(g.nome)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
          <div class="fd-mops"><a class="btn" href="#/g/${esc(g.slug)}" data-close>${ico('gente')} Ver o grupo</a>
            <button type="button" class="btn" data-act="msg-estado" data-a="${c.eu.silenciada ? 'dessilenciar' : 'silenciar'}">${ico(c.eu.silenciada ? 'bell' : 'micoff')} ${c.eu.silenciada ? 'Voltar a avisar' : 'Silenciar o papo'}</button>
            <button type="button" class="btn" data-act="msg-apaga-conv">${ico('trash')} Limpar o papo da tua caixa</button></div>
          <p class="fine">Silenciado, o papo não conta no número do topo nem toca no celular. Limpar some só pra você; pra sair do grupo, abre o grupo.</p></div>`);
        return;
      }
      const o = c.outro;
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>@${esc(o.handle)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-mops"><a class="btn" href="#/@${esc(o.handle)}" data-close>${ico('eu')} Ver perfil</a>
          ${c.eu.estado === 'aceita' ? `<button type="button" class="btn" data-act="msg-estado" data-a="${c.eu.silenciada ? 'dessilenciar' : 'silenciar'}">${ico(c.eu.silenciada ? 'bell' : 'micoff')} ${c.eu.silenciada ? 'Voltar a avisar' : 'Silenciar'}</button>` : ''}
          <button type="button" class="btn" data-act="msg-apaga-conv">${ico('trash')} Apagar conversa</button>
          <button type="button" class="btn ghost" data-act="msg-bloq"${c.bloqueei ? ' data-on="1"' : ''}>${ico('lock')} ${c.bloqueei ? 'Desbloquear' : 'Bloquear'} @${esc(o.handle)}</button></div>
        <p class="fine">Apagar tira a conversa da tua caixa (a outra pessoa continua com ela). Bloquear vale pro Corre todo: mensagem e cidade.</p></div>`);
    },
    'msg-estado': async el => {
      const c = M.conv, a = el.dataset.a; if(!c || el.disabled) return;
      el.disabled = true;
      try{
        const r = await rpc('corre_msg_estado', { p_conversa: c.conversa, p_acao: a });
        Object.assign(c.eu, r);
        C.closeSheet();
        if(a === 'recusar'){ C.toast('Recusado. A pessoa não consegue mais te mandar mensagem.', 3600); await carregaCaixa(); C.go('#/msg'); return; }
        C.toast(a === 'aceitar' ? 'Conversa aceita.' : a === 'silenciar' ? 'Silenciada: não conta no número do topo.' : 'Volta a avisar.', 2600);
        if(a === 'aceitar'){ M.aba = 'conversas'; marcaLida(); }
        atualizaTrava(); pintaBolhas();
        await carregaCaixa(); pintaCaixa(); sync(true);
      }catch(e){ el.disabled = false; C.toast(erroTxt(e)); }
    },
    'msg-apaga-conv': async el => {
      const c = M.conv; if(!c) return;
      if(!armar(el, 'Toca de novo pra apagar da tua caixa')) return;
      try{ await rpc('corre_msg_estado', { p_conversa: c.conversa, p_acao: 'apagar' }); C.closeSheet(); C.toast('Conversa apagada da tua caixa.'); await carregaCaixa(); C.go('#/msg'); }
      catch(e){ C.toast(erroTxt(e)); }
    },
    'msg-bloq': async el => {
      const c = M.conv; if(!c) return; const o = c.outro, on = el.dataset.on === '1';
      if(!on && !armar(el, `Toca de novo pra bloquear @${o.handle}`)) return;
      try{
        if(on) await C.api.del('corre_verso_bloq', { dono: uid(), quem: o.id }); else await C.api.ins('corre_verso_bloq', { quem: o.id });
        c.bloqueei = !on; C.closeSheet();
        C.toast(on ? `@${o.handle} desbloqueado.` : `@${o.handle} bloqueado: não te manda mensagem nem te vê na cidade.`, 3600);
        atualizaTrava(); pintaBolhas(); await carregaCaixa(); pintaCaixa(); sync(true);
      }catch(e){ if(e && e.code === '23505'){ c.bloqueei = true; atualizaTrava(); pintaBolhas(); return; } C.toast(erroTxt(e)); }
    },
    /* tocar numa bolha: copiar e (a tua) apagar pra todo mundo */
    'msg-bolha': (el, e) => {
      if(e && e.target && e.target.closest && e.target.closest('a, .msg-foto-b')) return;
      const m = M.msgs.find(x => x.id === el.dataset.id); if(!m || m.tmp || m.apagada) return;
      const meu = m.dono === uid(); if(!m.texto && !meu) return;
      C.sheet(`<div class="form fd-fsheet"><div class="sheet-head"><h2>Mensagem</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
        <div class="fd-mops">${m.texto ? `<button type="button" class="btn" data-act="msg-copia" data-id="${esc(m.id)}">${ico('copy')} Copiar texto</button>` : ''}${meu ? `<button type="button" class="btn ghost" data-act="msg-apaga" data-id="${esc(m.id)}">${ico('trash')} Apagar pra todo mundo</button>` : ''}</div>
        <p class="fine">${esc(diaRot(m.created_at))} às ${esc(hora(m.created_at))}</p></div>`);
    },
    'msg-copia': el => { const m = M.msgs.find(x => x.id === el.dataset.id); if(m) C.copy(m.texto, 'Texto copiado.'); C.closeSheet(); },
    'msg-apaga': async el => {
      if(!armar(el, 'Toca de novo pra apagar')) return;
      try{
        const r = await rpc('corre_msg_apagar', { p_msg: el.dataset.id });
        if(r && r.midia_antiga && C.api.msg) C.api.msg.tira(r.midia_antiga);
        const i = M.msgs.findIndex(x => x.id === el.dataset.id); if(i >= 0) M.msgs[i] = Object.assign({}, M.msgs[i], { texto: '', midia: '', ref: null, apagada: true });
        C.closeSheet(); pintaBolhas(); carregaCaixa().then(pintaCaixa);
      }catch(e){ C.toast(erroTxt(e)); }
    },
    'msg-ver-foto': el => {
      const m = M.msgs.find(x => x.id === el.dataset.id); if(!m || !m.midia) return;
      const src = /^(data:|blob:)/.test(m.midia) ? m.midia : M.fotos[m.midia]; if(!src) return;
      C.sheet(`<div class="form msg-fotao"><div class="sheet-head"><h2>Foto</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><img src="${esc(src)}" alt="Foto da conversa"></div>`);
    }
  });

  C.msg = { botao, sync, para: esquece, pintaBadge, mandar, nova, estado: () => M };
})();
