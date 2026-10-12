/* CORRE · VISITAS
   Visita marcada com o cliente: entra no calendário do estúdio da marca, no sino do topo e no início,
   com a confirmação e o lembrete prontos pro WhatsApp do cliente. Só a dona vê (RLS). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const PAUTAS = ['Captação de vídeo', 'Sessão de fotos', 'Reunião', 'Gravação de conteúdo', 'Entrega', 'Visita técnica'];
  /* o que vai rolar, na língua de cada corre (vem primeiro no campo) */
  const PAUTAS_CAT = {
    tattoo: ['Sessão de tatuagem', 'Avaliação', 'Retoque', 'Piercing'], beleza: ['Atendimento', 'Avaliação', 'Retorno'], comida: ['Entrega da encomenda', 'Retirada', 'Degustação'],
    eventos: ['Montagem', 'Evento', 'Visita ao local'], musica: ['Show', 'Ensaio', 'Gravação'], reforma: ['Orçamento no local', 'Serviço', 'Vistoria'], tecnica: ['Visita técnica', 'Instalação', 'Manutenção'],
    aulas: ['Aula', 'Aula experimental', 'Mentoria'], foto_video: ['Ensaio', 'Captação', 'Entrega do material'], casa: ['Faxina', 'Serviço', 'Orçamento no local'], frete: ['Coleta', 'Entrega', 'Mudança']
  };
  const pautas = () => { const c = (C.st.me && C.st.me.categoria) || ''; return Array.from(new Set((PAUTAS_CAT[c] || []).concat(PAUTAS))); };
  const DUR = [[30, '30 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h'], [240, '4 h'], [480, 'o dia todo']];
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], DOW3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ST = { marcada: 'Marcada', feita: 'Feita', cancelada: 'Cancelada' };

  /* Brasília é UTC−3 o ano todo */
  const isoUTC = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const hoje = () => isoUTC(Date.now() - 3 * 36e5), amanha = () => isoUTC(Date.now() - 3 * 36e5 + DAY);
  const at = v => { const [y, m, d] = v.data.split('-').map(Number), [h, mi] = (v.hora || '12:00').split(':').map(Number); return Date.UTC(y, m - 1, d, h + 3, mi); };
  const fim = v => at(v) + (Number(v.duracao) || 60) * 6e4;
  const dw = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const dia = iso => `${DOW[dw(iso)]}, ${ddmm(iso)}`;
  const curto = iso => iso === hoje() ? 'hoje' : iso === amanha() ? 'amanhã' : `${DOW3[dw(iso)]} ${ddmm(iso)}`;
  const hh = h => { const [a, b] = String(h || '').split(':'); return a ? (b === '00' ? `${+a}h` : `${+a}h${b}`) : ''; };
  const durTxt = n => (DUR.find(x => x[0] === Number(n)) || [0, `${Math.round(n / 6) / 10} h`])[1];
  const quando = v => `${curto(v.data)} às ${hh(v.hora)}`;
  const soDig = v => String(v || '').replace(/\D/g, '').slice(0, 15);
  const waNum = w => { const d = soDig(w).replace(/^0+/, ''); return !d ? '' : d.length <= 11 ? '55' + d : d; };
  const waLink = (w, txt) => `https://wa.me/${waNum(w)}?text=${encodeURIComponent(txt)}`;
  const rota = local => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
  const fone = w => { const d = soDig(w); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
  const eu = () => C.firstName(C.st.me && C.st.me.nome);
  const oi = v => v.contato ? `Oi, ${C.firstName(v.contato)}!` : 'Oi!';
  const passou = v => Date.now() > fim(v);

  function msgConfirma(v){
    return `${oi(v)} ${eu()} aqui. Confirmando nosso horário: ${dia(v.data)}, às ${hh(v.hora)}${v.local ? `, em ${v.local}` : ''}.`
      + (v.pauta ? `\nPauta: ${v.pauta.charAt(0).toLowerCase() + v.pauta.slice(1)}${v.duracao ? `, ${v.duracao >= 480 ? 'o dia todo' : 'uns ' + durTxt(v.duracao)}` : ''}.` : '')
      + '\nSe precisar mudar alguma coisa, me chama aqui.';
  }
  function msgLembrete(v){
    const q = v.data === hoje() ? `hoje, às ${hh(v.hora)}` : v.data === amanha() ? `amanhã (${dia(v.data)}), às ${hh(v.hora)}` : `${dia(v.data)}, às ${hh(v.hora)}`;
    return `${oi(v)} Passando pra lembrar do nosso horário ${q}${v.local ? `, em ${v.local}` : ''}. Tá de pé?`;
  }
  /* o botão do WhatsApp manda a confirmação primeiro; depois dela, vira lembrete */
  const qualMsg = v => v.confirmou ? ['lembrou', 'Lembrar', msgLembrete(v)] : ['confirmou', 'Confirmar', msgConfirma(v)];

  /* ---------- dados: as próximas visitas de todas as marcas (pro sino e pro início) ---------- */
  const V = { lista: [], marcas: {}, leads: {}, by: {}, at: 0, p: null };
  /* a visita é com uma marca do portfólio (estúdio) ou com um lead do Hórus (prospecção) */
  const curtoNome = s => String(s || '').replace(/\s+(ltda|me|epp|eireli|s\/?a|s\.a\.)\.?$/i, '').replace(/\s+[-–|].*$/, '').trim() || String(s || '');
  const alvoDe = v => (v.lead_id && V.leads[v.lead_id]) ? { nome: curtoNome(V.leads[v.lead_id].nome), lead: V.leads[v.lead_id] } : V.marcas[v.marca_id] ? { nome: V.marcas[v.marca_id].marca, marca: V.marcas[v.marca_id] } : null;
  async function buscaLeads(vs){
    const ids = [...new Set(vs.map(v => v.lead_id).filter(id => id && !V.leads[id]))];
    if(!ids.length) return;
    try{ (await C.api.q('corre_leads', { in: { id: ids.slice(0, 200) } })).forEach(l => { V.leads[l.id] = l; }); }catch(e){}
  }
  const conhece = rows => (rows || []).forEach(v => { V.by[v.id] = v; });
  function carregar(force){
    if(!C.st.user || !C.st.me) return Promise.resolve([]);
    if(!force && V.p) return V.p;
    if(!force && Date.now() - V.at < 60e3) return Promise.resolve(V.lista);
    V.p = (async () => {
      try{
        const [vs, ms] = await Promise.all([
          C.api.q('corre_visitas', { eq: { dono: C.uid(), status: 'marcada' }, gte: { data: isoUTC(Date.now() - 3 * 36e5 - DAY) }, order: ['data', true], limit: 200 }),
          C.api.q('corre_portfolio', { eq: { dono: C.uid() }, limit: 60 })
        ]);
        V.marcas = {}; ms.forEach(m => { V.marcas[m.id] = m; });
        await buscaLeads(vs);
        V.lista = vs.filter(v => !passou(v)).sort((a, b) => at(a) - at(b)); conhece(vs); V.at = Date.now();
      }catch(e){ V.lista = V.lista || []; }
      finally{ V.p = null; }
      return V.lista;
    })();
    return V.p;
  }
  const invalidar = () => { V.at = 0; };
  const proximas = dias => { const lim = isoUTC(Date.now() - 3 * 36e5 + (dias || 7) * DAY); return V.lista.filter(v => v.data <= lim); };
  const contaSino = () => V.lista.filter(v => v.data === hoje() || v.data === amanha()).length;

  /* ---------- sino do topo ---------- */
  /* o sino soma os avisos novos da rede (curtidas, respostas, seguidores...) e as visitas de hoje e amanhã */
  const nAvisos = () => (C.avisos ? C.avisos.n() : 0);
  const rotuloSino = (a, v) => [a ? `${a} ${a === 1 ? 'aviso novo' : 'avisos novos'}` : '', v ? `${v} ${v === 1 ? 'visita' : 'visitas'} entre hoje e amanhã` : ''].filter(Boolean).join(', ') || 'Avisos e agenda';
  function bell(){
    const a = nAvisos(), v = contaSino(), n = a + v;
    return `<button type="button" class="sino" id="sino" data-act="sino" aria-label="${rotuloSino(a, v)}" title="Avisos">${ico('bell')}<span class="sino-n num"${n ? '' : ' hidden'}>${n > 99 ? '99+' : n}</span></button>`;
  }
  /* v3.38: os Avisos aparecem no menu do computador e na barra do celular; os dois ganham o número */
  function pintaSino(){
    const bs = document.querySelectorAll('[data-sino], #sino'); if(!bs.length) return;
    const a = nAvisos(), v = contaSino(), n = a + v, temHoje = V.lista.some(x => x.data === hoje());
    bs.forEach(b => {
      const s = b.querySelector('.sino-n'); if(!s) return;
      s.textContent = n > 99 ? '99+' : n; s.hidden = !n; b.setAttribute('aria-label', rotuloSino(a, v)); b.classList.toggle('hoje', temHoje);
    });
  }
  /* aviso dentro do Corre: visita de hoje aparece uma vez por dia em cada aparelho */
  function avisaHoje(){
    let vistos = {}; try{ vistos = JSON.parse(localStorage.getItem('corre-vis-av') || '{}'); }catch(e){}
    if(vistos.d !== hoje()) vistos = { d: hoje(), ids: [] };
    const nova = V.lista.find(v => v.data === hoje() && !vistos.ids.includes(v.id));
    if(!nova) return;
    const a = alvoDe(nova);
    C.toast(`Hoje às ${hh(nova.hora)}: visita${a ? ' · ' + a.nome : ''}${nova.pauta ? ' · ' + nova.pauta : ''}.`, 6000);
    vistos.ids = V.lista.filter(v => v.data === hoje()).map(v => v.id);
    try{ localStorage.setItem('corre-vis-av', JSON.stringify(vistos)); }catch(e){}
  }
  async function sync(force){ await carregar(force); pintaSino(); avisaHoje(); }

  /* ---------- um item de visita (estúdio, agenda e início usam o mesmo) ---------- */
  function itemHTML(v, o){
    const a = (o && o.marca) ? { nome: o.marca.marca } : alvoDe(v), [k, rot, txt] = qualMsg(v), isT = v.data === hoje();
    const sub = [v.local, v.contato ? 'com ' + v.contato : ''].filter(Boolean).join(' · ');
    return `<li class="vs-item ${esc(v.status)}${isT ? ' hoje' : ''}">
      <button type="button" class="vs-when" data-act="vs-abrir" data-id="${esc(v.id)}" aria-label="Abrir a visita de ${esc(quando(v))}"><b class="num">${hh(v.hora)}</b><span>${esc(curto(v.data))}</span></button>
      <div class="vs-tx"><b>${esc(v.pauta || 'Visita')}${o && o.comMarca && a ? ` · ${esc(a.nome)}` : ''}</b><span>${esc(sub || 'Sem endereço ainda')}</span>
        ${v.status !== 'marcada' ? `<span class="vs-tag">${ST[v.status]}</span>` : v.lembrou ? '<span class="vs-tag ok">Lembrete enviado</span>' : v.confirmou ? '<span class="vs-tag ok">Confirmação enviada</span>' : ''}</div>
      ${v.status === 'marcada' ? `<div class="vs-acts">${v.local ? `<a class="btn sm" href="${esc(rota(v.local))}" target="_blank" rel="noopener">${ico('pin')} Rota</a>` : ''}<a class="btn sm" href="${esc(waLink(v.whats, txt))}" target="_blank" rel="noopener" data-act="vs-wa" data-id="${esc(v.id)}" data-k="${k}">${ico('wa')} ${rot}</a></div>` : ''}
    </li>`;
  }

  /* ---------- a agenda (abre pelo sino) ---------- */
  async function agenda(){
    C.sheet(`<div class="form vs-ag"><div class="sheet-head"><h2>${ico('bell')} Agenda</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><div id="vs-ag-l"><p class="note">Abrindo a agenda…</p></div></div>`);
    await agendaEm(C.$('vs-ag-l'));
  }
  /* a lista da agenda dentro de qualquer caixa (a aba Agenda do sino) */
  async function agendaEm(box){
    if(box) box.innerHTML = '<p class="note">Abrindo a agenda…</p>';
    await carregar(true); pintaSino();
    if(!box || !box.isConnected) return;
    const L = V.lista;
    if(!L.length){ box.innerHTML = `<p class="note">Nada marcado. Marca pela ficha do cliente no Hórus, pelo "Agendar" das Vendas, ou pelo estúdio de uma marca no Portfólio: tudo aparece aqui e nos Avisos.</p><div class="acts"><a class="btn" href="#/vendas" data-close>${ico('next')} Abrir as vendas</a></div>`; return; }
    const g = [['Hoje', L.filter(v => v.data === hoje())], ['Amanhã', L.filter(v => v.data === amanha())], ['Próximos dias', L.filter(v => v.data > amanha())]].filter(x => x[1].length);
    box.innerHTML = g.map(([t, vs]) => `<h3 class="vs-g">${t}</h3><ul class="vs-list">${vs.map(v => itemHTML(v, { comMarca: true })).join('')}</ul>`).join('')
      + `<p class="fine">O botão do WhatsApp abre a conversa do cliente com a mensagem pronta: primeiro a confirmação, depois o lembrete.</p>`;
  }

  /* ---------- marcar ou editar uma visita ---------- */
  function editor(v, mk, o){
    o = o || {}; const novo = !v;
    const lead = o.lead || (v && v.lead_id && V.leads[v.lead_id]) || null;
    if(lead) V.leads[lead.id] = lead;
    const d = v || { data: o.dia && o.dia >= hoje() ? o.dia : hoje(), hora: o.hora || '14:00', duracao: 60, pauta: o.pauta || '', local: lead ? [lead.endereco, lead.bairro].filter(Boolean).join(', ') : '', contato: '', whats: lead ? (lead.wa || lead.fixo || '') : '', obs: '', status: 'marcada' };
    if(!mk && !lead) mk = V.marcas[d.marca_id] || { marca: 'Marca' };
    const nome = lead ? curtoNome(lead.nome) : mk.marca;
    C.sheet(`<form class="form vs-ed" id="vs-f" novalidate><div class="sheet-head"><h2>${novo ? 'Marcar na agenda' : 'Na agenda'} · ${esc(nome)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="vs-p">O que vai rolar</label><input class="inp" id="vs-p" list="vs-ps" maxlength="60" value="${esc(d.pauta)}" placeholder="${esc(pautas().slice(0, 3).join(', '))}…"><datalist id="vs-ps">${pautas().map(p => `<option value="${esc(p)}">`).join('')}</datalist></div>
      <div class="row2"><div class="fld"><label for="vs-d">Dia</label><input class="inp" id="vs-d" type="date" required value="${esc(d.data)}"></div><div class="fld"><label for="vs-h">Hora</label><input class="inp" id="vs-h" type="time" required value="${esc(d.hora)}"></div></div>
      <div class="fld"><label for="vs-du">Duração</label><select class="inp" id="vs-du">${DUR.map(([n, t]) => `<option value="${n}"${Number(d.duracao) === n ? ' selected' : ''}>${t === 'o dia todo' ? 'O dia todo' : t}</option>`).join('')}</select></div>
      <div class="fld"><label for="vs-l">Endereço</label><input class="inp" id="vs-l" maxlength="200" value="${esc(d.local)}" placeholder="Rua, número, bairro" autocomplete="street-address"><span class="hint">Vira o botão de rota no Maps.</span></div>
      <div class="row2"><div class="fld"><label for="vs-c">Quem recebe</label><input class="inp" id="vs-c" maxlength="60" value="${esc(d.contato)}" placeholder="Nome do contato"></div><div class="fld"><label for="vs-w">WhatsApp do cliente</label><input class="inp" id="vs-w" inputmode="tel" maxlength="20" value="${esc(fone(d.whats))}" placeholder="(43) 99999-9999"></div></div>
      <div class="fld"><label for="vs-o">Observação</label><textarea class="inp" id="vs-o" rows="2" maxlength="500" placeholder="Levar o tripé, falar com o gerente…">${esc(d.obs)}</textarea></div>
      ${novo ? '' : `<div class="fld"><span class="lbl-s">Situação</span><div class="seg2" role="radiogroup" aria-label="Situação">${Object.entries(ST).map(([k, t]) => `<label><input type="radio" name="vs-st" value="${k}"${d.status === k ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></div>`}
      <div class="acts sticky"><button type="submit" class="btn pri">${novo ? 'Marcar' : 'Salvar'}</button>${novo ? '' : `<a class="btn" id="vs-wa" href="#" target="_blank" rel="noopener">${ico('wa')} WhatsApp</a><button type="button" class="btn ghost" id="vs-del" aria-label="Apagar visita">${ico('trash')}</button>`}</div>
    </form>`);
    const ler = () => {
      const st = document.querySelector('input[name="vs-st"]:checked');
      return { pauta: C.$('vs-p').value.trim().slice(0, 60), data: C.$('vs-d').value, hora: C.$('vs-h').value, duracao: Number(C.$('vs-du').value) || 60,
        local: C.$('vs-l').value.trim().slice(0, 200), contato: C.$('vs-c').value.trim().slice(0, 60), whats: soDig(C.$('vs-w').value), obs: C.$('vs-o').value.trim().slice(0, 500), status: st ? st.value : d.status };
    };
    const wa = C.$('vs-wa');
    const pintaWa = () => { if(!wa) return; const x = Object.assign({}, d, ler()), [k, rot, txt] = qualMsg(x); wa.href = waLink(x.whats, txt); wa.dataset.k = k; wa.innerHTML = `${ico('wa')} ${rot} no WhatsApp`; };
    pintaWa(); C.$('vs-f').addEventListener('input', pintaWa);
    if(wa) wa.addEventListener('click', () => marcaEnvio(v, wa.dataset.k, o.onSave));
    const del = C.$('vs-del');
    if(del) del.addEventListener('click', async () => {
      /* primeiro toque: o botão vira "Apagar de vez?" (some sozinho em 5 s); segundo toque apaga */
      if(del.dataset.armed !== '1'){
        del.dataset.armed = '1'; del.classList.add('armed'); del.innerHTML = `${ico('trash')} Apagar de vez?`; del.setAttribute('aria-label', 'Confirmar: apagar a visita');
        clearTimeout(del._t); del._t = setTimeout(() => { if(!del.isConnected) return; del.dataset.armed = ''; del.classList.remove('armed'); del.innerHTML = ico('trash'); del.setAttribute('aria-label', 'Apagar visita'); }, 5000);
        return;
      }
      clearTimeout(del._t); del.disabled = true; del.innerHTML = `${ico('trash')} Apagando…`;
      try{ await C.api.del('corre_visitas', { id: v.id }); delete V.by[v.id]; invalidar(); C.closeSheet(); C.toast('Visita apagada.'); sync(true); depois(o.onSave); }
      catch(e){ del.disabled = false; del.dataset.armed = ''; del.classList.remove('armed'); del.innerHTML = ico('trash'); C.toast(C.errMsg(e, 'Não deu pra apagar agora.')); }
    });
    C.$('vs-f').addEventListener('submit', async e => {
      e.preventDefault();
      const row = ler();
      if(!row.data){ C.toast('Escolhe o dia da visita.'); C.$('vs-d').focus(); return; }
      if(!/^\d{2}:\d{2}$/.test(row.hora)){ C.toast('Escolhe a hora da visita.'); C.$('vs-h').focus(); return; }
      if(row.whats && row.whats.length < 10){ C.toast('Coloca o WhatsApp com DDD.'); C.$('vs-w').focus(); return; }
      const b = e.submitter || C.$('vs-f').querySelector('[type="submit"]'); if(b) b.disabled = true;
      try{
        let salvo;
        if(novo){ salvo = (await C.api.ins('corre_visitas', Object.assign(lead ? { lead_id: lead.id } : { marca_id: mk.id }, row)))[0]; }
        else{
          /* mudou dia ou hora: a confirmação antiga não vale mais */
          if(row.data !== v.data || row.hora !== v.hora){ row.confirmou = null; row.lembrou = null; }
          salvo = (await C.api.upd('corre_visitas', { id: v.id }, row))[0] || Object.assign({}, v, row);
        }
        conhece([salvo]); invalidar(); sync(true);
        if(novo && salvo.status === 'marcada') pronto(salvo, nome, o, !!lead); else { C.closeSheet(); C.toast('Visita salva.'); }
        depois(o.onSave, salvo);
      }catch(err){ C.toast(C.errMsg(err, 'Não deu pra salvar a visita.')); }
      finally{ if(b) b.disabled = false; }
    });
  }
  /* visita marcada: a confirmação pro cliente já vem escrita */
  function pronto(v, nome, o, ehLead){
    const txt = msgConfirma(v);
    C.sheet(`<div class="form vs-ok"><div class="sheet-head"><h2>Marcado</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="vs-big"><b>${esc(dia(v.data).replace(/^./, c => c.toUpperCase()))}, às ${hh(v.hora)}</b><span>${esc(nome)}${v.pauta ? ' · ' + esc(v.pauta) : ''}</span></p>
      <p class="note">${ehLead ? `Entrou na agenda dos Avisos e na ficha da ${esc(nome)} no Hórus.` : `Entrou no calendário do estúdio da ${esc(nome)} e nos Avisos.`} No dia, o Corre te avisa.</p>
      <div class="fld"><label for="vs-msg">Confirmação pro cliente</label><textarea class="inp" id="vs-msg" rows="6" readonly>${esc(txt)}</textarea></div>
      <div class="acts"><a class="btn pri" id="vs-ok-wa" href="${esc(waLink(v.whats, txt))}" target="_blank" rel="noopener">${ico('wa')} Mandar no WhatsApp${v.contato ? ' da ' + esc(C.firstName(v.contato)) : ''}</a><button type="button" class="btn" id="vs-ok-cp">${ico('copy')} Copiar</button><button type="button" class="btn ghost" data-close>Fechar</button></div>
      ${v.whats ? '' : '<p class="fine">Sem o número do cliente, o WhatsApp abre pra você escolher o contato.</p>'}
    </div>`);
    C.$('vs-ok-wa').addEventListener('click', () => marcaEnvio(v, 'confirmou', o && o.onSave));
    C.$('vs-ok-cp').addEventListener('click', () => C.copy(txt, 'Mensagem copiada.'));
  }
  /* o Corre não sabe se a mensagem saiu: marca que o WhatsApp foi aberto com ela */
  async function marcaEnvio(v, k, onSave){
    if(!v || !v.id || !['confirmou', 'lembrou'].includes(k)) return;
    const patch = { [k]: new Date().toISOString() };
    try{ await C.api.upd('corre_visitas', { id: v.id }, patch); Object.assign(v, patch); if(V.by[v.id]) Object.assign(V.by[v.id], patch); invalidar(); depois(onSave, v); }catch(e){}
  }
  function depois(f, v){ try{ if(f) f(v); }catch(e){} if(C.estudio && C.estudio.recarregar) C.estudio.recarregar(); if(C.horusTurbo && C.horusTurbo.visitasMudaram) C.horusTurbo.visitasMudaram(); if(C.$('vs-ag-l') && !C.$('vs-f')) agenda(); else if(C.$('av-l') && C.avisos && C.avisos.aba && C.avisos.aba() === 'agenda' && !C.$('vs-f')) agendaEm(C.$('av-l')); }

  /* ---------- início: as visitas da semana ---------- */
  C.home.push({ k: 'visitas', o: -1, async html(){
    await carregar(); pintaSino(); avisaHoje();
    const L = proximas(7); if(!L.length) return '';
    return `<div class="hcard vis-mini">
      <div class="hc-top"><span class="hc-name">${ico('pin')}Visitas</span><span class="mono">${L.length === 1 ? '1 nesta semana' : L.length + ' nesta semana'}</span></div>
      <ol class="mini-list">${L.slice(0, 3).map(v => { const a = alvoDe(v); return `<li class="${v.data === hoje() ? 'hoje' : ''}"><b>${esc(quando(v).replace(/^./, c => c.toUpperCase()))}${a ? ' · ' + esc(a.nome) : ''}</b><small>${esc([v.pauta, v.local].filter(Boolean).join(' · ') || 'Visita')}</small></li>`; }).join('')}</ol>
      <button type="button" class="hc-go" data-act="vs-agenda">Ver agenda ${ico('next')}</button>
    </div>`;
  } });

  Object.assign(C.acts, {
    'vs-agenda': () => (C.avisos ? C.avisos.abrir('agenda') : agenda()),
    /* o número do sino é só de visita (nenhum aviso novo): já abre na Agenda */
    sino: () => (C.avisos ? C.avisos.abrir(!C.avisos.n() && contaSino() > 0 ? 'agenda' : 'tudo') : agenda()),
    'vs-abrir': async el => {
      let v = V.by[el.dataset.id];
      if(!v){ try{ v = await C.api.one('corre_visitas', { eq: { id: el.dataset.id } }); }catch(e){ v = null; } }
      if(!v){ C.toast('Essa visita não existe mais.'); return; }
      if(v.lead_id){ await buscaLeads([v]); editor(v, null, { lead: V.leads[v.lead_id] }); return; }
      if(!V.marcas[v.marca_id]) await carregar(true);
      editor(v, V.marcas[v.marca_id] || (C.estudio && C.estudio.marca && C.estudio.marca()), {});
    },
    'vs-wa': el => { const v = V.by[el.dataset.id]; if(v) marcaEnvio(v, el.dataset.k); }
  });

  /* várias de uma vez (rota do Hórus): cada parada vira uma visita com o lead */
  async function criarVarias(rows){
    const out = await C.api.ins('corre_visitas', rows.map(r => Object.assign({ duracao: 30, pauta: '', local: '', contato: '', whats: '', obs: '', status: 'marcada' }, r)));
    conhece(out); invalidar(); await sync(true); return out;
  }
  const doLead = id => Object.values(V.by).filter(v => v.lead_id === id && v.status === 'marcada' && !passou(v)).sort((a, b) => at(a) - at(b));
  C.visitas = { PAUTAS, pautas, at, fim, hh, quando, curto, dia, msgConfirma, msgLembrete, waLink, rota, bell, sync, carregar, invalidar, conhece, editor, itemHTML, agenda, agendaEm, pintaSino, contaSino, proximas, passou, criarVarias, doLead, alvoDe };
})();
