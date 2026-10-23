/* CORRE · v4.34 · o Atendente 24h
   O Thales pediu um app "TOP DOS TOPS de funcionalidades e inteligência e conexão e automatização e suporte"; o
   Atendente é a parte que trabalha enquanto a pessoa dorme: no link na bio e na página do orçamento, o cliente tira a
   dúvida na hora, com o que a dona ensinou na ficha, e quando quer fechar deixa o nome e o WhatsApp, que caem na
   Entrada do Hórus com o aviso no celular.
     C.atende.monta(lugar, p, origem)  o botão "Tirar dúvida agora" na página pública (bio.js e o orçamento do horus-max).
                                       Só aparece com o atendente ligado (corre_atende_info, aberta).
     #/atendente                       a página da dona: ligar, a ficha, testar antes de ligar e as conversas.
     #/atendente/c/ID                  o aviso do celular abre a conversa.
   Quem fala com a IA é a função "atende" (sem login); os limites e o cliente no Hórus são do banco (delta-v434.sql).
   A conversa do cliente fica no aparelho dele (a chave, por 7 dias) e no banco (só a dona lê; parada 90 dias, esvazia). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;
  const TONS = [['perto', 'Próximo', 'Simpático, como no balcão'], ['direto', 'Direto', 'Responde em poucas palavras'], ['formal', 'Formal', 'Educado, sem gíria']];
  const MAX_FAQ = 12;
  const semFn = e => !!e && (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42883' || e.code === '42P01' || /Could not find the (function|table)|does not exist|schema cache/i.test(e.message || ''));
  const semFuncao = e => !!e && (e.code === 'nofn' || e.code === 'fn' || (e.status === 404 && e.code !== 'desligado'));
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  const waDe = d => { d = String(d || '').replace(/\D/g, ''); if(d.length > 11 && d.startsWith('55')) d = d.slice(2); return d.length === 10 || d.length === 11 ? d : ''; };

  /* ====================== o lado do cliente ====================== */
  const W = { h: '', p: null, origem: 'bio', ola: '', nome: '', conversa: '', chave: '', msgs: [], pensa: false, contato: false };
  const KEY = h => 'corre-atende:' + h;
  function guarda(){ try{ localStorage.setItem(KEY(W.h), JSON.stringify({ c: W.conversa, k: W.chave, m: W.msgs.slice(-30), ok: W.contato, t: Date.now() })); }catch(e){} }
  function lembra(h){ try{ const x = JSON.parse(localStorage.getItem(KEY(h)) || 'null'); if(x && Date.now() - (x.t || 0) < 7 * 864e5) return x; }catch(e){} return null; }
  const olaDe = n => `Oi! Sou o atendente automático de ${n || 'quem tá aqui'}. Pergunta o que quiser sobre o trabalho: preço, prazo, como funciona.`;

  async function monta(lugar, p, origem){
    if(!lugar || !p || !p.handle) return;
    let info = null;
    try{ info = await api.rpc('corre_atende_info', { p_h: p.handle }); }catch(e){ return; }
    if(!info || !info.on || !lugar.isConnected) return;
    Object.assign(W, { h: p.handle, p, origem: origem === 'orcamento' ? 'orcamento' : 'bio', nome: info.nome || primeiro(p.nome), ola: info.ola || '', conversa: '', chave: '', msgs: [], pensa: false, contato: false });
    const g = lembra(p.handle);
    if(g){ W.conversa = g.c || ''; W.chave = g.k || ''; W.msgs = Array.isArray(g.m) ? g.m : []; W.contato = !!g.ok; }
    if(lugar.querySelector('.atd-bolha')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'atd-bolha'; b.dataset.act = 'atd-abre';
    b.innerHTML = `<span class="atd-bolha-i">${ico('atende')}</span><span><b>Tirar dúvida agora</b><small>O atendente de ${esc(W.nome)} responde na hora</small></span>`;
    lugar.appendChild(b);
  }

  const balao = m => `<li class="atd-m ${m.q === 'c' ? 'eu' : 'ele'}${m.erro ? ' erro' : ''}"><p>${esc(m.v)}</p></li>`;
  function listaHTML(){
    const ola = { q: 'a', v: W.ola || olaDe(W.nome) };
    return [ola].concat(W.msgs).map(balao).join('') + (W.pensa ? '<li class="atd-m ele pensa" aria-label="Pensando"><p><i></i><i></i><i></i></p></li>' : '');
  }
  const ATALHOS = ['Quanto custa?', 'Como funciona?', 'Quero um orçamento'];
  function abre(){
    const wa = waDe(W.p && W.p.whats_publico);
    C.sheet(`<div class="atd-chat" role="form" aria-labelledby="atd-t">
      <div class="sheet-head"><h2 id="atd-t">${ico('atende')} Atendente de ${esc(W.nome)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="atd-aviso">Quem responde aqui é o atendente automático (com IA) de ${esc(W.nome)}, com o que ${esc(W.nome)} ensinou. Pra fechar, ele pede teu nome e WhatsApp e ${esc(W.nome)} te chama.</p>
      <ol class="atd-l" id="atd-l" aria-live="polite">${listaHTML()}</ol>
      <div class="atd-ok" id="atd-ok"${W.contato ? '' : ' hidden'}>${ico('check')} Pronto! ${esc(W.nome)} recebeu teu contato e vai te chamar no WhatsApp.</div>
      <div class="atd-atalhos" id="atd-atalhos"${W.msgs.length ? ' hidden' : ''}>${ATALHOS.map(t => `<button type="button" class="chip" data-act="atd-atalho" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <form class="atd-form" id="atd-f"><label class="sr-only" for="atd-in">Tua mensagem</label>
        <textarea id="atd-in" class="inp" rows="1" maxlength="500" placeholder="Escreve tua dúvida…" enterkeyhint="send"></textarea>
        <button type="submit" class="btn pri" id="atd-manda" aria-label="Mandar">${ico('send')}</button></form>
      <p class="fine atd-pe">${wa ? `<a href="https://wa.me/55${wa}?text=${encodeURIComponent(`Oi, ${W.nome}! Vim pelo teu link.`)}" target="_blank" rel="noopener">${ico('wa')} Falar direto no WhatsApp</a> · ` : ''}Não manda senha, cartão nem documento aqui. <a href="privacidade.html#atendente" target="_blank" rel="noopener">Privacidade</a></p>
    </div>`, 'atd-folha');
    const f = $('atd-f'), tx = $('atd-in');
    f.addEventListener('submit', e => { e.preventDefault(); manda(tx.value); });
    tx.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); manda(tx.value); } });
    tx.addEventListener('input', () => { tx.style.height = 'auto'; tx.style.height = Math.min(120, tx.scrollHeight) + 'px'; });
    rola(); setTimeout(() => tx.focus(), 60);
  }
  function rola(){ const l = $('atd-l'); if(l) l.scrollTop = l.scrollHeight; }
  function pinta(){
    const l = $('atd-l'); if(!l) return;
    l.innerHTML = listaHTML(); rola();
    const a = $('atd-atalhos'); if(a) a.hidden = W.msgs.length > 0;
    const ok = $('atd-ok'); if(ok) ok.hidden = !W.contato;
    const b = $('atd-manda'); if(b) b.disabled = W.pensa;
  }
  async function manda(v){
    v = String(v || '').trim().slice(0, 500);
    if(!v || W.pensa) return;
    const tx = $('atd-in'); if(tx){ tx.value = ''; tx.style.height = 'auto'; }
    W.msgs.push({ q: 'c', v }); W.pensa = true; pinta();
    let r = null, err = null;
    try{ r = await api.fn('atende', { acao: 'fala', h: W.h, conversa: W.conversa || null, chave: W.chave || null, msg: v, origem: W.origem }, true); }
    catch(e){ err = e; }
    W.pensa = false;
    if(r && r.resposta){
      if(r.conversa) W.conversa = r.conversa;
      if(r.chave) W.chave = r.chave;
      W.msgs.push({ q: 'a', v: r.resposta, erro: !!r.falhou });
      if(r.contato && !W.contato){ W.contato = true; if(C.avisaPedido) C.avisaPedido(); }
    } else {
      const wa = waDe((err && err.whats) || (W.p && W.p.whats_publico));
      const txt = err && err.resposta ? err.resposta
        : err && err.code === 'desligado' ? `O atendente de ${W.nome} foi desligado agora.${wa ? ' Chama direto no WhatsApp.' : ''}`
        : `Não consegui responder agora. Tenta de novo daqui a pouco${wa ? ' ou chama direto no WhatsApp' : ''}.`;
      W.msgs.push({ q: 'a', v: txt, erro: true });
    }
    guarda(); pinta();
    const t2 = $('atd-in'); if(t2) t2.focus();
  }

  /* ====================== o lado da dona ====================== */
  const D = { ficha: null, ligado: false, convs: [], vit: [], teste: [], testePensa: false, semBanco: false, sujo: false };
  const vazia = () => ({ sobre: '', servicos: '', precos: '', como: '', onde: '', horario: '', nunca: '', ola: '', tom: 'perto', vitrine: true, faq: [] });
  /* o que o Corre já sabe da pessoa vira o começo da ficha (ela só confere e completa) */
  function sugestao(f){
    const me = st.me || {}, x = Object.assign(vazia(), f || {});
    if(!x.sobre) x.sobre = [me.faz, me.bio].filter(Boolean).join('. ').slice(0, 800);
    if(!x.onde && me.cidade) x.onde = me.cidade;
    if(!x.servicos && D.vit.length) x.servicos = D.vit.slice(0, 12).map(i => i.nome).join(', ').slice(0, 1500);
    return x;
  }
  const lugares = () => {
    const me = st.me || {}, bio = !me.bio_link || me.bio_link.on !== false, orc = (me.horus || {}).orcamento === 'on';
    return { bio, orc, h: me.handle };
  };
  const ORIGEM = { bio: 'Link na bio', orcamento: 'Pedido de orçamento' };
  function convLinha(c){
    const prim = (c.msgs || []).find(m => m.q === 'c'), quem = c.nome || 'Cliente sem nome', novo = !c.visto;
    return `<li><button type="button" class="atd-cv${novo ? ' novo' : ''}" data-act="atd-conv" data-id="${esc(c.id)}">
      <span class="atd-cv-t"><b>${esc(quem)}</b>${c.lead_id ? '<span class="atd-tag ok">deixou o WhatsApp</span>' : ''}${novo ? '<span class="atd-tag novo">nova</span>' : ''}</span>
      <span class="atd-cv-m">${esc(c.resumo || (prim && prim.v) || '')}</span>
      <small>${esc(ORIGEM[c.origem] || '')} · ${esc(C.rel(c.updated_at))} · ${(c.msgs || []).filter(m => m.q === 'c').length} mensagens</small></button></li>`;
  }
  function numeros(){
    const sem = Date.now() - 7 * 864e5, L = D.convs.filter(c => Date.parse(c.created_at) >= sem);
    return { sem: L.length, viraram: L.filter(c => c.lead_id).length, novas: D.convs.filter(c => !c.visto).length };
  }
  function fichaHTML(f){
    const ta = (k, rot, dica, n, rows) => `<div class="fld"><label for="atd-${k}">${rot}</label>${dica ? `<p class="hint">${dica}</p>` : ''}<textarea class="inp" id="atd-${k}" data-k="${k}" rows="${rows || 3}" maxlength="${n}">${esc(f[k] || '')}</textarea></div>`;
    const inp = (k, rot, dica, n, ph) => `<div class="fld"><label for="atd-${k}">${rot}</label>${dica ? `<p class="hint">${dica}</p>` : ''}<input class="inp" id="atd-${k}" data-k="${k}" maxlength="${n}" value="${esc(f[k] || '')}"${ph ? ` placeholder="${esc(ph)}"` : ''}></div>`;
    return `<form class="form atd-ficha" id="atd-ficha" novalidate>
      ${ta('sobre', 'O que você faz', 'Uma ou duas frases, do jeito que você explica pra um cliente.', 800)}
      ${ta('servicos', 'Serviços', 'O que você faz e o que não faz.', 1500)}
      ${ta('precos', 'Preços', 'O que pode dizer de preço. O que depende do caso, escreve "depende" que ele pede o contato.', 1000)}
      <label class="atd-chk"><input type="checkbox" id="atd-vitrine"${f.vitrine !== false ? ' checked' : ''}> <span>Usar o meu catálogo também${D.vit.length ? ` <small>(${D.vit.length} ${D.vit.length === 1 ? 'item' : 'itens'} com preço)</small>` : ' <small>(ainda vazio)</small>'}</span></label>
      ${ta('como', 'Como funciona', 'Prazo, sinal, como paga, como é a entrega.', 800)}
      <div class="row2">${inp('onde', 'Onde atende', '', 300, 'Londrina e região')}${inp('horario', 'Horário', '', 300, 'Seg a sex, 9h às 18h')}</div>
      <fieldset class="atd-faq"><legend>Perguntas que sempre fazem <small>(até ${MAX_FAQ})</small></legend>
        <ol id="atd-faq-l">${(f.faq || []).map((x, i) => faqLinha(x, i)).join('')}</ol>
        <button type="button" class="btn ghost sm" data-act="atd-faq-mais"${(f.faq || []).length >= MAX_FAQ ? ' disabled' : ''}>${ico('plus')} Mais uma pergunta</button></fieldset>
      <fieldset class="atd-tons"><legend>Jeito de falar</legend>${TONS.map(([k, t, d]) => `<label class="atd-tom"><input type="radio" name="atd-tom" value="${k}"${(f.tom || 'perto') === k ? ' checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}</fieldset>
      ${ta('nunca', 'O que ele nunca deve dizer', 'Ex.: não falar de desconto, não marcar horário, não falar de concorrente.', 600, 2)}
      ${inp('ola', 'O oi dele', '', 200, olaDe(primeiro((st.me || {}).nome)))}
      <div class="acts"><button type="submit" class="btn pri" id="atd-salva">${ico('check')} Salvar a ficha</button><button type="button" class="btn ghost" data-act="atd-sugere">${ico('magia')} Preencher com o que o Corre já sabe</button></div>
    </form>`;
  }
  const faqLinha = (x, i) => `<li class="atd-faq-i"><input class="inp" data-faq="p" maxlength="200" placeholder="A pergunta" value="${esc(x.p || '')}" aria-label="Pergunta ${i + 1}"><textarea class="inp" data-faq="r" rows="2" maxlength="600" placeholder="A resposta" aria-label="Resposta ${i + 1}">${esc(x.r || '')}</textarea><button type="button" class="cbtn plain" data-act="atd-faq-tira" data-i="${i}" aria-label="Tirar a pergunta ${i + 1}">${ico('x')}</button></li>`;
  /* a ficha do jeito que tá na tela (pra salvar e pra testar antes de salvar) */
  function lerFicha(){
    const f = vazia(), fm = $('atd-ficha'); if(!fm) return D.ficha || f;
    fm.querySelectorAll('[data-k]').forEach(el => { f[el.dataset.k] = el.value.trim(); });
    f.vitrine = !!($('atd-vitrine') || {}).checked;
    const tom = fm.querySelector('input[name="atd-tom"]:checked'); f.tom = tom ? tom.value : 'perto';
    f.faq = [...fm.querySelectorAll('.atd-faq-i')].map(li => ({ p: li.querySelector('[data-faq="p"]').value.trim(), r: li.querySelector('[data-faq="r"]').value.trim() })).filter(x => x.p || x.r).slice(0, MAX_FAQ);
    return f;
  }
  function testeHTML(){
    return `<ol class="atd-l teste" id="atd-tl" aria-live="polite">${[{ q: 'a', v: (lerFicha().ola || olaDe(primeiro((st.me || {}).nome))) }].concat(D.teste).map(balao).join('')}${D.testePensa ? '<li class="atd-m ele pensa" aria-label="Pensando"><p><i></i><i></i><i></i></p></li>' : ''}</ol>
      <form class="atd-form" id="atd-tf"><label class="sr-only" for="atd-tin">Pergunta de teste</label><textarea id="atd-tin" class="inp" rows="1" maxlength="500" placeholder="Pergunta como se fosse um cliente…"></textarea><button type="submit" class="btn pri" aria-label="Mandar o teste">${ico('send')}</button></form>
      ${D.teste.length ? '<button type="button" class="btn ghost sm" data-act="atd-teste-limpa">Começar o teste de novo</button>' : ''}`;
  }
  function pagina(app){
    const L = lugares(), n = numeros(), f = D.ficha || sugestao(null), on = D.ligado;
    const nenhum = !L.bio && !L.orc;
    app.innerHTML = C.header('atende') + `<main class="wrap atd-pg">
      <header class="atd-topo"><span class="atd-topo-i">${ico('atende')}</span><div><span class="mono">Atendente 24h</span><h1>Teu cliente atendido na hora, até de madrugada</h1>
        <p>Ele responde no teu link na bio e no pedido de orçamento, com o que você ensinar aqui. Quando o cliente quer fechar, pega o nome e o WhatsApp e põe na Entrada do Hórus, com aviso no teu celular.</p></div>
        <button type="button" class="atd-liga${on ? ' on' : ''}" data-act="atd-liga" aria-pressed="${on}"><span class="atd-liga-b" aria-hidden="true"></span><span>${on ? 'Ligado' : 'Desligado'}</span></button></header>
      ${D.semBanco ? '<p class="atd-falta">O Atendente liga quando o banco do Corre atualizar (falta o delta-v434.sql).</p>' : ''}
      <section class="atd-num" aria-label="A semana">
        <div><b class="num">${n.sem}</b><span>conversas na semana</span></div><div><b class="num">${n.viraram}</b><span>deixaram o WhatsApp</span></div><div class="${n.novas ? 'quente' : ''}"><b class="num">${n.novas}</b><span>pra você ler</span></div>
      </section>
      <section class="card atd-onde"><h2>Onde ele atende</h2>
        <ul><li class="${L.bio ? 'on' : ''}">${ico('link')}<span><b>Link na bio</b><small>${L.bio ? esc(location.host + '/@' + L.h) : 'Desligado'}</small></span>${L.bio ? `<a class="btn ghost sm" href="#/bio/${esc(L.h)}">Ver</a>` : '<a class="btn ghost sm" href="#/linkbio">Ligar</a>'}</li>
          <li class="${L.orc ? 'on' : ''}">${ico('recibo')}<span><b>Pedido de orçamento</b><small>${L.orc ? esc(location.host + '/#/orcamento/' + L.h) : 'Desligado (Hórus › Entrada)'}</small></span>${L.orc ? `<a class="btn ghost sm" href="#/orcamento/${esc(L.h)}">Ver</a>` : ''}</li></ul>
        ${nenhum ? '<p class="note">Liga o link na bio ou o pedido de orçamento pra ele ter onde atender.</p>' : ''}</section>
      <section class="card atd-sec"><h2>A ficha</h2><p class="hint">É tudo o que ele sabe. O que não tá aqui, ele não inventa: pede o contato e passa pra você.</p>${fichaHTML(f)}</section>
      <section class="card atd-sec"><h2>Testa antes</h2><p class="hint">Conversa com ele como se fosse um cliente. Usa a ficha do jeito que tá na tela, mesmo sem salvar.</p><div id="atd-teste">${testeHTML()}</div></section>
      <section class="card atd-sec"><div class="atd-h"><h2>Conversas</h2><span>${D.convs.length ? `${D.convs.length} nos últimos 90 dias` : ''}</span></div>
        ${D.convs.length ? `<ol class="atd-cvs">${D.convs.map(convLinha).join('')}</ol>` : `<p class="hz-muted">${on ? 'Ninguém conversou ainda. Põe teu link na bio no Instagram e no status do WhatsApp.' : 'Liga o atendente e as conversas aparecem aqui.'}</p>`}
        <p class="fine">O que o cliente escreve fica guardado só pra você e some sozinho depois de 90 dias parado. Pra gerar a resposta, a mensagem passa pela IA (OpenAI).</p></section>
    </main>`;
    $('atd-ficha').addEventListener('submit', e => { e.preventDefault(); salva(false); });
    $('atd-ficha').addEventListener('input', () => { D.sujo = true; });
    ligaTeste();
  }
  function ligaTeste(){
    const f = $('atd-tf'), tx = $('atd-tin'); if(!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); testa(tx.value); });
    tx.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); testa(tx.value); } });
  }
  function pintaTeste(foco){ const b = $('atd-teste'); if(!b) return; b.innerHTML = testeHTML(); ligaTeste(); const l = $('atd-tl'); if(l) l.scrollTop = l.scrollHeight; if(foco){ const t = $('atd-tin'); if(t) t.focus(); } }
  async function testa(v){
    v = String(v || '').trim().slice(0, 500); if(!v || D.testePensa) return;
    D.teste.push({ q: 'c', v }); D.testePensa = true; pintaTeste();
    try{
      const r = await api.fn('atende', { acao: 'teste', ficha: lerFicha(), msgs: D.teste.slice(-16).map(m => ({ q: m.q, v: m.v })) }, true);
      D.teste.push({ q: 'a', v: r.resposta + (r.contato ? `\n\n(no de verdade, ${r.nome || 'o cliente'} entraria agora na Entrada do Hórus)` : '') });
    }catch(e){
      D.teste.push({ q: 'a', erro: true, v: e && e.code === 'limite' ? 'Chega de teste por hoje (80 por dia). Amanhã tem mais.' : semFuncao(e) ? 'O atendente liga quando a função "atende" subir no Supabase.' : 'Não deu pra responder agora. Tenta de novo.' });
    }
    D.testePensa = false; pintaTeste(true);
  }
  async function salva(liga){
    const f = lerFicha(), on = liga == null ? D.ligado : liga;
    if(on && !f.sobre && !f.servicos){ toast('Conta o que você faz (ou os serviços) antes de ligar.'); const s = $('atd-sobre'); if(s) s.focus(); return false; }
    const b = $('atd-salva'); if(b) b.disabled = true;
    try{
      const r = await api.rpc('corre_atende_salva', { p_ligado: !!on, p_ficha: f });
      D.ficha = (r && r.ficha) || f; D.ligado = !!(r && r.ligado); D.sujo = false;
      return true;
    }catch(e){
      toast(semFn(e) ? 'O Atendente liga quando o banco do Corre atualizar.' : /ficha/.test((e && (e.hint || e.message)) || '') ? 'Conta o que você faz antes de ligar.' : C.errMsg(e), 4200);
      return false;
    }finally{ if(b) b.disabled = false; }
  }
  async function carrega(){
    const eu = C.uid(); D.semBanco = false;
    const [a, cv, vit] = await Promise.all([
      api.one('corre_atendente', { eq: { dono: eu } }).catch(e => { if(semFn(e)) D.semBanco = true; return null; }),
      api.q('corre_atende_conversas', { eq: { dono: eu, limpa: false }, order: ['updated_at', false], limit: 60 }).catch(() => []),
      api.rpc('corre_vitrine', { p: eu }).catch(() => null)
    ]);
    D.vit = (vit && vit.itens) || [];
    D.ficha = a && a.ficha && Object.keys(a.ficha).length ? Object.assign(vazia(), a.ficha) : null;
    D.ligado = !!(a && a.ligado);
    D.convs = (cv || []).filter(c => !c.limpa && (c.msgs || []).length);
  }
  function convSheet(id){
    const c = D.convs.find(x => x.id === id);
    if(!c){ toast('Essa conversa não tá mais aqui.'); return; }
    const me = st.me || {}, wa = waDe(c.whats);
    const msgTxt = `Oi, ${primeiro(c.nome) || 'tudo bem'}! Aqui é ${primeiro(me.nome) || me.nome || ''}. Vi tua conversa no meu atendente${c.resumo ? ` (${c.resumo.replace(/\.$/, '')})` : ''}. Bora fechar?`;
    C.sheet(`<div class="atd-conv"><div class="sheet-head"><h2>${ico('atende')} ${esc(c.nome || 'Cliente sem nome')}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="fine">${esc(ORIGEM[c.origem] || '')} · começou ${esc(C.rel(c.created_at))}${c.resumo ? ` · <b>${esc(c.resumo)}</b>` : ''}</p>
      <ol class="atd-l conv">${(c.msgs || []).map(balao).join('')}</ol>
      <div class="acts">${wa ? `<a class="btn pri" href="https://wa.me/55${wa}?text=${encodeURIComponent(msgTxt)}" target="_blank" rel="noopener">${ico('wa')} Chamar ${esc(primeiro(c.nome) || '')} no WhatsApp</a>` : ''}
        ${c.lead_id && C.ferr('horus') ? '<a class="btn ghost" href="#/horus/entrada" data-close>Ver na Entrada do Hórus</a>' : ''}
        <button type="button" class="btn ghost" data-act="atd-limpa" data-id="${esc(c.id)}">${ico('trash')} Limpar a conversa</button></div></div>`, 'atd-folha');
    if(!c.visto){ c.visto = true; api.rpc('corre_atende_visto', { p_id: c.id }).catch(() => {}); }
  }

  C.views.atendente = async (app, sub) => {
    document.title = 'Atendente 24h · Corre';
    app.innerHTML = C.header('atende') + `<main class="wrap atd-pg"><section class="card"><p class="note">Abrindo o Atendente…</p></section></main>`;
    const rota = C.rota;
    await carrega();
    if(rota !== C.rota) return;
    pagina(app);
    const m = /^c\/([0-9a-f-]{36})$/.exec(sub || '');
    if(m){ try{ history.replaceState(null, '', location.pathname + location.search + '#/atendente'); }catch(e){} convSheet(m[1]); }
  };

  Object.assign(C.acts, {
    'atd-abre': () => abre(),
    'atd-atalho': el => manda(el.dataset.t),
    'atd-liga': async el => {
      const quer = !D.ligado;
      el.disabled = true;
      const ok = await salva(quer);
      el.disabled = false;
      if(!ok) return;
      toast(D.ligado ? 'Atendente ligado. Ele já responde no teu link na bio e no orçamento.' : 'Atendente desligado. As conversas ficam aqui.', 3600);
      pagina($('app'));
    },
    'atd-sugere': () => {
      const f = sugestao(lerFicha());
      Object.entries(f).forEach(([k, v]) => { const el = $('atd-' + k); if(el && typeof v === 'string' && !el.value.trim()) el.value = v; });
      D.sujo = true; toast('Preenchi o que tava vazio com o que o Corre sabe. Confere e salva.');
    },
    'atd-faq-mais': el => {
      const l = $('atd-faq-l'); if(!l || l.children.length >= MAX_FAQ) return;
      l.insertAdjacentHTML('beforeend', faqLinha({ p: '', r: '' }, l.children.length));
      if(l.children.length >= MAX_FAQ) el.disabled = true;
      const ult = l.lastElementChild.querySelector('input'); if(ult) ult.focus();
    },
    'atd-faq-tira': el => { const li = el.closest('li'); if(li) li.remove(); D.sujo = true; const b = document.querySelector('[data-act="atd-faq-mais"]'); if(b) b.disabled = false; },
    'atd-teste-limpa': () => { D.teste = []; pintaTeste(true); },
    'atd-conv': el => convSheet(el.dataset.id),
    'atd-limpa': async el => {
      if(!await C.confirma({ titulo: 'Limpar essa conversa?', texto: 'O que o cliente escreveu sai daqui pra sempre. O cliente que já tá no Hórus continua lá.', sim: 'Limpar', nao: 'Agora não', ico: 'trash' })) return;
      try{ await api.rpc('corre_atende_limpa', { p_id: el.dataset.id }); D.convs = D.convs.filter(c => c.id !== el.dataset.id); C.closeSheet(); toast('Conversa limpa.'); pagina($('app')); }
      catch(e){ toast(C.errMsg(e)); }
    }
  });

  /* a "IA" de mentira do demo: responde pela ficha, sem rede (o core.js chama) */
  function demo(ficha, nome, msgs){
    const f = Object.assign(vazia(), ficha || {}), u = String((msgs[msgs.length - 1] || {}).v || ''), n = nome || 'a pessoa';
    const tem = re => re.test(u.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    const dig = u.replace(/\D/g, '');
    if(dig.length >= 10){
      const nm = ((u.split(/[\d(+]/)[0] || '').split(/[.!?;,]/).map(x => x.trim()).filter(Boolean).pop() || '').replace(/^(meu nome é|meu nome e|sou o|sou a|eu sou|aqui é|aqui e)\s+/i, '').trim().split(/\s+/).slice(0, 3).join(' ');
      return { resposta: `Anotado${nm ? ', ' + nm : ''}! ${n} vai te chamar no WhatsApp.`, nome: nm.length >= 2 ? nm : 'Cliente', whats: dig, resumo: (msgs.filter(m => m.q === 'c').slice(-3, -1).map(m => m.v).join(' ') || 'Quer falar com você.').slice(0, 200) };
    }
    const hit = (f.faq || []).find(x => String(x.p || '').toLowerCase().split(/\W+/).filter(w => w.length > 3).some(w => u.toLowerCase().includes(w)));
    if(hit) return { resposta: hit.r };
    if(tem(/pre[cç]o|quanto|valor|custa|cobra/)) return { resposta: (f.precos || 'O valor certo depende do que você precisa.') + ` Quer que ${n} te passe o valor? Me diz teu nome e WhatsApp com DDD.` };
    if(tem(/horario|abre|fecha|atende quando/)) return { resposta: f.horario ? `${f.horario}.` : `Isso ${n} te responde. Me passa teu nome e WhatsApp?` };
    if(tem(/onde|endereco|cidade|regiao/)) return { resposta: f.onde ? `Atende ${f.onde}.` : `Isso ${n} te responde. Me passa teu nome e WhatsApp?` };
    if(tem(/orcamento|fechar|agendar|quero|contratar/)) return { resposta: `Fechou! Me passa teu nome e WhatsApp com DDD que ${n} te chama.` };
    if(tem(/como funciona|prazo|demora|pagamento|sinal/)) return { resposta: f.como || `Isso ${n} combina contigo. Me passa teu nome e WhatsApp?` };
    return { resposta: `${(f.sobre || 'Aqui é ' + n + '.').slice(0, 160)} Quer saber preço, prazo ou já fazer um orçamento?` };
  }

  C.atende = { monta, demo, _: { W, D } };
})();
