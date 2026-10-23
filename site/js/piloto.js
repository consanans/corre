/* CORRE · v4.34 · o Piloto automático
   A outra metade do pedido do Thales ("automatização e suporte e apoio pro usuário"): o Corre olha o Hórus, as Vendas
   e o Studio de hora em hora e põe no Caderninho o que tá esfriando, com o botão que resolve num toque. Ele nunca manda
   nada sozinho pra ninguém: a mensagem sai pronta, mas quem manda é a pessoa.
     #/piloto                 ligar, as quatro receitas (com os dias de cada uma), rodar agora e o que ele fez.
     C.piloto.botao(t)        o botão da tarefa que veio do piloto (WhatsApp, Cobrar, Abrir o Studio...), no Caderninho.
     C.piloto.faixa()         o convite pra ligar, no Hoje do Caderninho (some no "Agora não").
     C.piloto.talvez()        o Caderninho aberto roda o piloto (no máximo de hora em hora), pra não esperar o relógio.
   Quem decide o que entra é o banco (delta-v434.sql: corre_piloto_de); aqui é só a tela. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;
  const P = { meu: null, semBanco: false, vez: 0 };
  const RECEITAS = [
    ['esfria', 'Cliente esfriando', 'eye', d => `Cliente do Hórus em Contatado, Interessado ou Proposta sem nada há ${d} dias vira "Retomar Fulano", com o WhatsApp num toque.`, [3, 5, 7, 10, 15]],
    ['cobra', 'Cobrança vencida', 'grana', () => 'Venda fechada que venceu (ou vence hoje) e não foi paga vira "Cobrar Fulano", com a mensagem e o teu Pix prontos. O valor não aparece na tela do celular.'],
    ['studio', 'Marca sem post', 'magia', d => `Marca com o @ sem nenhum post nos próximos ${d} dias vira "Programar os posts", que abre o Studio dela.`, [3, 5, 7, 10, 14]],
    ['aprovado', 'Orçamento aprovado', 'check', () => 'Quando o cliente aprova o orçamento pelo link, entram "Começar o trabalho" hoje e "Entregar" no dia da entrega.']
  ];
  const ICO = Object.fromEntries(RECEITAS.map(r => [r[0], r[2]]));
  const semFn = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist|schema cache/i.test(e.message || ''));
  const ls = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
  const K_VEZ = () => 'corre-piloto-vez:' + (C.uid() || ''), K_NAO = () => 'corre-piloto-nao:' + (C.uid() || '');
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  const waDe = d => { d = String(d || '').replace(/\D/g, ''); if(d.length > 11 && d.startsWith('55')) d = d.slice(2); return d.length === 10 || d.length === 11 ? d : ''; };
  const ddmm = iso => iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : '';

  async function carrega(){
    P.semBanco = false;
    try{ P.meu = await api.rpc('corre_piloto_meu', {}); }
    catch(e){ P.meu = null; if(semFn(e)) P.semBanco = true; }
    return P.meu;
  }

  /* ---------- a página ---------- */
  function receitaHTML([k, t, ic, txt, dias], R){
    const r = (R && R[k]) || {};
    return `<li class="pl-r${r.on !== false ? ' on' : ''}">
      <span class="pl-r-i">${ico(ic)}</span>
      <div><h3>${esc(t)}</h3><p>${esc(txt(r.dias || (k === 'esfria' ? 5 : 7)))}</p>
        ${dias ? `<label class="pl-dias"><span>Depois de</span><select class="inp sm" data-dias="${k}" aria-label="Dias de ${esc(t)}">${dias.map(n => `<option value="${n}"${(r.dias || (k === 'esfria' ? 5 : 7)) === n ? ' selected' : ''}>${n} dias</option>`).join('')}</select></label>` : ''}</div>
      <label class="switch sm"><input type="checkbox" data-rec="${k}"${r.on !== false ? ' checked' : ''} aria-label="${esc(t)}"><span class="sw" aria-hidden="true"></span></label></li>`;
  }
  const NOME_R = Object.fromEntries(RECEITAS.map(r => [r[0], r[1]]));
  function pagina(app){
    const m = P.meu || { ligado: false, receitas: {}, log: [], abertas: 0, feitas: 0 }, on = !!m.ligado;
    app.innerHTML = C.header('piloto') + `<main class="wrap pl-pg">
      <header class="pl-topo"><span class="pl-topo-i">${ico('piloto')}</span><div><span class="mono">Piloto automático</span><h1>O Corre lembra por você</h1>
        <p>De hora em hora (das 7h às 20h) ele olha teu Hórus, tuas Vendas e o Studio e põe no Caderninho o que tá esfriando, com o botão que resolve. Ele nunca manda nada sozinho: a mensagem sai pronta, quem manda é você.</p></div>
        <button type="button" class="atd-liga${on ? ' on' : ''}" data-act="pl-liga" aria-pressed="${on}"><span class="atd-liga-b" aria-hidden="true"></span><span>${on ? 'Ligado' : 'Desligado'}</span></button></header>
      ${P.semBanco ? '<p class="atd-falta">O Piloto liga quando o banco do Corre atualizar (falta o delta-v434.sql).</p>' : ''}
      <section class="atd-num" aria-label="O piloto"><div><b class="num">${m.abertas || 0}</b><span>no teu Caderninho agora</span></div><div><b class="num">${m.feitas || 0}</b><span>resolvidas em 30 dias</span></div><div><b class="num">${(m.log || []).length}</b><span>que ele achou em 30 dias</span></div></section>
      <section class="card"><h2>O que ele olha</h2><ul class="pl-rs" id="pl-rs">${RECEITAS.map(r => receitaHTML(r, m.receitas)).join('')}</ul>
        <div class="acts"><button type="button" class="btn pri" data-act="pl-salva">${ico('check')} Salvar</button>${on ? `<button type="button" class="btn ghost" data-act="pl-roda">${ico('raio')} Olhar agora</button>` : ''}<a class="btn ghost" href="#/caderninho">${ico('caderno')} Abrir o Caderninho</a></div></section>
      <section class="card"><h2>O que ele fez</h2>${(m.log || []).length ? `<ol class="pl-log">${m.log.map(g => `<li><span class="pl-log-i">${ico(ICO[g.receita] || 'piloto')}</span><span><b>${esc(g.titulo)}</b><small>${esc(NOME_R[g.receita] || '')} · ${esc(C.rel(g.em))}</small></span></li>`).join('')}</ol>`
        : `<p class="hz-muted">${on ? 'Nada esfriando por enquanto. Quando aparecer, vai direto pro teu Caderninho.' : 'Liga o piloto e o que ele achar aparece aqui e no teu Caderninho.'}</p>`}
        <p class="fine">As tarefas do piloto entram no teu bom dia do celular. Feita ou não, ele não repete a mesma coisa antes do tempo.</p></section>
    </main>`;
  }
  function lerReceitas(){
    const r = {};
    RECEITAS.forEach(([k]) => { const c = document.querySelector(`[data-rec="${k}"]`), s = document.querySelector(`[data-dias="${k}"]`); r[k] = { on: c ? c.checked : true }; if(s) r[k].dias = +s.value; });
    return r;
  }
  async function salva(ligado){
    const m = P.meu || {};
    try{
      const r = await api.rpc('corre_piloto_salva', { p_ligado: ligado == null ? !!m.ligado : !!ligado, p_receitas: $('pl-rs') ? lerReceitas() : (m.receitas || {}) });
      P.meu = Object.assign({}, m, { ligado: !!(r && r.ligado), receitas: (r && r.receitas) || {} , existe: true });
      return true;
    }catch(e){ toast(semFn(e) ? 'O Piloto liga quando o banco do Corre atualizar.' : C.errMsg(e), 4200); return false; }
  }
  async function roda(diz){
    let r = null;
    try{ r = await api.rpc('corre_piloto_ja', {}); }catch(e){ if(diz) toast(semFn(e) ? 'O Piloto liga quando o banco do Corre atualizar.' : C.errMsg(e)); return null; }
    ls.set(K_VEZ(), String(Date.now()));
    const n = (r && r.feitas || []).length;
    if(diz) toast(r && r.cedo ? 'Ele acabou de olhar. Daqui a pouco olha de novo.' : n ? `O piloto pôs ${n === 1 ? '1 tarefa' : n + ' tarefas'} no teu Caderninho.` : 'Tudo em dia: nada esfriando agora.', 3600);
    return r;
  }

  C.views.piloto = async app => {
    document.title = 'Piloto automático · Corre';
    app.innerHTML = C.header('piloto') + `<main class="wrap pl-pg"><section class="card"><p class="note">Abrindo o piloto…</p></section></main>`;
    const rota = C.rota;
    await carrega();
    if(rota !== C.rota) return;
    pagina(app);
  };

  /* ---------- no Caderninho ---------- */
  const ROT = { lead: ['wa', 'WhatsApp'], venda: ['wa', 'Cobrar'], marca: ['magia', 'Abrir o Studio'] };
  function botao(t){
    if(!t || !t.piloto || !t.liga || t.feito) return '';
    const l = t.liga, wa = waDe(l.wa);
    let r = ROT[l.t]; if(!r) return '';
    if(l.t === 'venda'){ r = t.piloto === 'aprovado' ? (String(l.ref || '').endsWith(':entrega') ? ['grana', 'Abrir a venda'] : ['wa', 'Combinar']) : ['wa', 'Cobrar']; if(!wa && r[0] === 'wa') r = ['grana', 'Abrir a venda']; }
    if(l.t === 'lead' && !wa) r = ['eye', 'Abrir no Hórus'];
    return `<button type="button" class="cd-pl-bt" data-act="pl-faz" data-id="${esc(t.id)}">${ico(r[0])}<span>${esc(r[1])}</span></button>`;
  }
  const marcaPiloto = t => t && t.piloto ? `<span class="cd-pl" title="O piloto automático pôs aqui">${ico('piloto')}piloto</span>` : '';
  function faixa(){
    if(!P.meu || P.meu.ligado || P.meu.existe || P.semBanco || ls.get(K_NAO()) === '1') return '';
    return `<section class="pl-convite"><span class="pl-topo-i">${ico('piloto')}</span><div><b>Liga o piloto automático</b><p>O Corre põe aqui, sozinho, o cliente esfriando, a cobrança vencida e a marca sem post, com o botão que resolve.</p>
      <div class="acts"><button type="button" class="btn pri sm" data-act="pl-liga-ja">Ligar</button><a class="btn ghost sm" href="#/piloto">Ver como funciona</a><button type="button" class="btn ghost sm" data-act="pl-nao">Agora não</button></div></div></section>`;
  }
  /* o Caderninho aberto: roda o piloto (de hora em hora no máximo); o que ele achou entra na tela */
  async function talvez(){
    if(!C.uid()) return false;
    if(!P.meu && !P.semBanco) await carrega();
    /* (desligado: devolve se o convite tem que aparecer, pro Caderninho repintar) */
    if(!P.meu || !P.meu.ligado) return !!faixa();
    const ult = +ls.get(K_VEZ()) || 0;
    if(Date.now() - ult < 60 * 60e3) return false;
    const r = await roda(false);
    const n = (r && r.feitas || []).length;
    if(n){ toast(`O piloto pôs ${n === 1 ? '1 tarefa' : n + ' tarefas'} no teu dia.`, 3600); if(C.caderno && C.caderno.chegou) C.caderno.chegou(); }
    return false;
  }

  /* a mensagem pronta de cada coisa (a pessoa confere no WhatsApp antes de mandar) */
  async function faz(id){
    const t = C.caderno && C.caderno.tarefa ? C.caderno.tarefa(id) : null; if(!t || !t.liga) return;
    const l = t.liga, me = st.me || {}, eu = primeiro(me.nome) || me.nome || '', wa = waDe(l.wa);
    const pix = me.bio_link && me.bio_link.pix && me.bio_link.pix.chave ? String(me.bio_link.pix.chave) : '';
    const abre = (num, txt) => { const a = document.createElement('a'); a.href = `https://wa.me/55${num}?text=${encodeURIComponent(txt)}`; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); };
    if(l.t === 'marca'){ C.go('#/studio/' + encodeURIComponent(l.id)); return; }
    if(l.t === 'lead'){
      if(!wa){ C.go(C.ferr('horus') ? '#/horus/funil' : '#/horus'); return; }
      const nome = primeiro(String(t.titulo).replace(/^Retomar\s+/, '').replace(/\s*\(.*$/, ''));
      abre(wa, `Oi${nome ? ', ' + nome : ''}! Aqui é ${eu}. Passando pra saber se ainda faz sentido a gente seguir com aquilo que conversamos. Se for melhor outro momento, me diz que eu te chamo depois.`);
      /* o toque fica na linha do tempo do cliente (ele sai do "esfriando"), e a tarefa tá feita */
      try{ const lead = await api.one('corre_leads', { eq: { id: l.id } }); if(lead){ const h = [{ t: new Date().toISOString(), k: 'toque', v: 'WhatsApp (pelo piloto)' }].concat(Array.isArray(lead.hist) ? lead.hist : []).slice(0, 40); await api.upd('corre_leads', { id: l.id }, { hist: h }); } }catch(e){}
      C.acts['cd-feita']({ dataset: { id } });
      return;
    }
    if(l.t === 'venda'){
      let v = null; try{ v = await api.one('corre_vendas', { eq: { id: l.id } }); }catch(e){}
      const entrega = String(l.ref || '').endsWith(':entrega');
      if(!wa || entrega || !v){ C.go('#/corre'); return; }
      const nome = primeiro(v.cliente), item = ((v.itens || [])[0] || {}).n || '';
      const txt = t.piloto === 'aprovado'
        ? `Oi${nome ? ', ' + nome : ''}! Aqui é ${eu}. Recebi a aprovação do orçamento${item ? ` (${item})` : ''}. Bora começar? Me confirma os detalhes que eu já organizo tudo.`
        : `Oi${nome ? ', ' + nome : ''}! Aqui é ${eu}. Passando pra lembrar do pagamento${item ? ` de ${item}` : ''}${Number(v.total) > 0 ? `, ${C.money(Number(v.total) - (Number(v.sinal) || 0))}` : ''}, que ${v.vence && v.vence < C.hojeBR() ? 'venceu' : 'vence'} dia ${ddmm(v.vence)}.${pix ? ` Meu Pix: ${pix}` : ''} Qualquer coisa, me chama.`;
      abre(wa, txt);
      C.acts['cd-feita']({ dataset: { id } });
    }
  }

  Object.assign(C.acts, {
    'pl-liga': async el => {
      el.disabled = true;
      const quer = !(P.meu && P.meu.ligado), ok = await salva(quer);
      el.disabled = false; if(!ok) return;
      if(quer){ await roda(true); await carrega(); }
      else toast('Piloto desligado. O que ele já pôs no Caderninho fica lá.');
      pagina($('app'));
    },
    'pl-salva': async () => { if(await salva(null)){ toast('Salvo.'); await carrega(); pagina($('app')); } },
    'pl-roda': async () => { await roda(true); await carrega(); pagina($('app')); },
    'pl-liga-ja': async () => { if(!await salva(true)) return; const r = await roda(false); const n = (r && r.feitas || []).length; toast(n ? `Piloto ligado. Ele já pôs ${n === 1 ? '1 tarefa' : n + ' tarefas'} no teu dia.` : 'Piloto ligado. Tá tudo em dia; quando esfriar alguma coisa, ele põe aqui.', 4200); if(C.caderno && C.caderno.chegou) C.caderno.chegou(); },
    'pl-nao': () => { ls.set(K_NAO(), '1'); const s = document.querySelector('.pl-convite'); if(s) s.remove(); },
    'pl-faz': el => faz(el.dataset.id)
  });

  C.piloto = { botao, faixa, talvez, marca: marcaPiloto, _: P };
})();
