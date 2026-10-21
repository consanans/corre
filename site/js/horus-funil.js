/* CORRE · HÓRUS CRM (v4.16): o funil, a Entrada e o relatório.
   O Thales: "vamos crescer!", "talvez melhorar o hórus", "questão é mensagens, leads", "fazer tipo um RD Station".
   O Radar (horus.js) caça e aquece; aqui o cliente vira negócio:
   1. Funil: cada cliente é um cartão na etapa dele (Novo, Contatado, Interessado, Proposta, Fechou), com o valor em R$.
      Muda de etapa arrastando (mouse, ou o dedo segurando o cartão) ou pelas setinhas. Perdeu: diz o porquê. Fechou: diz
      quanto. Em cima, o que tá na mesa, a previsão e o fechado do mês; embaixo, como o funil anda (onde trava, de onde vem
      quem fecha, quanto tempo leva e por que perde).
   2. Entrada: quem chegou sozinho (pedido de orçamento, Mural, mensagem no Corre), o que espera resposta em cima.
   3. Mensagens: "Pôr no Hórus" na conversa com alguém do Corre (mensagens.js chama C.horusFunil.daConversa).
   O valor mora no corre_leads.valor (delta-v416.sql). Sem valor no cartão, vale o orçamento ligado a ele nas Vendas; nos
   totais, o "ganho por fechamento" do Placar entra como estimativa (marcado com ~). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  const F = { vendas: [], vAt: 0, vUid: '', perdAberto: false, entMais: 30, semValor: false };

  const COLS = [['novo', 'Novo'], ['contato', 'Contatado'], ['interesse', 'Interessado'], ['link', 'Proposta'], ['fechado', 'Fechou']];
  const IDX = { novo: 0, contato: 1, interesse: 2, link: 3, fechado: 4 };
  const NOME = Object.fromEntries(COLS);
  /* a chance de fechar de cada etapa: o chute do começo; com 5 decididos ou mais, vale a taxa da própria pessoa */
  const CHANCE = { novo: 0, contato: .1, interesse: .25, link: .5 };
  const ORIGEM = { link: 'Pediu orçamento', mural: 'Mural', corre: 'Mensagem no Corre', manual: 'Na mão', caca: 'Caça', vivo: 'Porta a porta', lista: 'Lista', horus: 'Backup', exemplo: 'Exemplo' };
  /* quem chegou sozinho (o resto o Hórus foi buscar) */
  const ENTRA = ['link', 'mural', 'corre'];
  const MOTIVOS = ['Preço', 'Já tem quem faz', 'Sumiu', 'Não é o momento', 'Não é o perfil', 'Escolheu outro'];
  const NOVO_MAX = 8, COL_MAX = 60;
  const ABAS = [['radar', 'Radar', 'eye'], ['funil', 'Funil', 'grafico'], ['entrada', 'Entrada', 'chat']];
  const K_ABA = 'corre-horus-aba';

  /* ---------- quando e quanto ---------- */
  const dia = t => t ? Z.localDay(t) : '';
  const hoje = () => Z.today();
  const mesDe = d => String(d || '').slice(0, 7);
  const hist = l => Array.isArray(l.hist) ? l.hist : [];
  /* o registro de quando entrou na etapa (a etapa vem escrita como "Etapa: Proposta"; pedido e Mural põem o cliente em
     Interessado sozinhos; o orçamento aprovado pelo link fecha sozinho) */
  const regEtapa = (x, st) => x && ((x.k === 'st' && String(x.v || '').startsWith('Etapa: ' + Z.SN[st]))
    || (st === 'interesse' && x.k === 'res' && /^(Pediu orçamento pelo link|Mural: .* escolheu tua proposta)/.test(x.v || ''))
    || (st === 'fechado' && x.k === 'res' && x.v === 'Aprovou o orçamento pelo link.'));
  function entrouEm(l){
    const x = hist(l).find(r => regEtapa(r, l.st));
    return x && x.t ? x.t : (l.st === 'novo' ? l.created_at : (l.updated_at || l.created_at));
  }
  const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const diasAqui = l => { const d = dia(entrouEm(l)); return d ? Math.max(0, daysBetween(d, hoje())) : 0; };
  /* quando fechou e quando perdeu (pra contar o mês e o tempo até fechar) */
  const fechouEm = l => l.st === 'fechado' ? dia(entrouEm(l)) : '';
  const perdeuEm = l => l.st === 'perdido' ? dia(entrouEm(l)) : '';
  function motivoDe(l){
    const x = hist(l).find(r => r.k === 'st' && /^Etapa: Perdido/.test(r.v || ''));
    if(!x) return '';
    const v = String(x.v || ''), m = v.match(/^Etapa: Perdido · (.+)$/);
    if(m) return m[1].trim();
    return /não é cliente/.test(v) ? 'Não é o perfil' : '';
  }
  /* a etapa mais longe que o cliente chegou (quem perdeu também conta até onde foi) */
  function chegou(l){
    let m = IDX[l.st] != null ? IDX[l.st] : 0;
    hist(l).forEach(x => {
      if(x.k === 'toque' || x.k === 'visita') m = Math.max(m, 1);
      COLS.forEach(([k], i) => { if(i && regEtapa(x, k)) m = Math.max(m, i); });
    });
    if(m === 0 && l.st === 'perdido' && hist(l).some(x => x.k === 'res' && !/^Sem resposta/.test(x.v || ''))) m = 1;
    return m;
  }

  /* as vendas ligadas aos leads (o orçamento diz quanto vale o negócio quando o cartão não tem valor) */
  async function vendasCarrega(forca){
    const u = C.uid(); if(!u) return;
    if(!forca && F.vUid === u && Date.now() - F.vAt < 60e3) return;
    try{ F.vendas = (await C.api.q('corre_vendas', { select: 'id,lead_id,st,total,created_at', eq: { dono: u }, order: ['created_at', false], limit: 3000 })).filter(v => v.lead_id); }
    catch(e){ F.vendas = []; }
    F.vUid = u; F.vAt = Date.now();
  }
  const vendaDo = l => F.vendas.find(v => v.lead_id === l.id && v.st !== 'perdido' && Number(v.total) > 0);
  const temValor = () => !F.semValor && (C.DEMO || !H.leads.length || H.leads.some(l => 'valor' in l));
  /* o valor do negócio: o do cartão; senão o do orçamento nas Vendas; e (só nos totais) o ganho por fechamento do Placar */
  function valorDe(l, estima){
    if(Number(l.valor) > 0) return { v: Number(l.valor), de: 'lead' };
    const vd = vendaDo(l); if(vd) return { v: Number(vd.total), de: 'venda' };
    const vf = +Z.cfg().valorFech || 0;
    return estima && vf ? { v: vf, de: 'estimado' } : { v: 0, de: '' };
  }
  const soma = (L, estima) => L.reduce((s, l) => { const x = valorDe(l, estima); return { v: s.v + x.v, est: s.est || x.de === 'estimado', sem: s.sem + (x.v ? 0 : 1) }; }, { v: 0, est: false, sem: 0 });
  const reais = (x, curto) => x.v ? `${x.est ? '~' : ''}${money(x.v)}` : (curto ? '' : money(0));

  /* chegou sozinho e ninguém respondeu ainda (o pedido mais novo vem antes de qualquer toque teu) */
  const pedidoReg = x => x && x.k === 'res' && /^(Pediu orçamento pelo link|Mural: .* escolheu tua proposta)/.test(x.v || '');
  function esperando(l){
    if(!ENTRA.includes(l.fonte) || Z.DONE.includes(l.st)) return false;
    const h = hist(l), i = h.findIndex(pedidoReg); if(i < 0) return false;
    const j = h.findIndex(x => x.k === 'toque');
    return j < 0 || j > i;
  }
  const quandoChegou = l => { const x = hist(l).find(pedidoReg) || hist(l).find(r => r.k === 'cria'); return (x && x.t) || l.created_at; };
  function oQuePediu(l){
    const x = hist(l).find(pedidoReg);
    if(x){ const v = String(x.v || ''); return v.startsWith('Pediu orçamento pelo link: ') ? v.slice(27) : v.startsWith('Mural: ') ? 'Te escolheu no Mural.' : ''; }
    return String(l.obs || '').replace(/^Pedido pelo link \([^)]*\):\s*/, '').split('\n')[0];
  }

  /* ---------- as abas ---------- */
  function abaDe(sub){
    const s = String(sub || '').replace(/^\//, '');
    if(ABAS.some(a => a[0] === s)) H.aba = s;
    else if(!H.aba){ let g = ''; try{ g = localStorage.getItem(K_ABA) || ''; }catch(e){} H.aba = ABAS.some(a => a[0] === g) ? g : 'radar'; }
    return H.aba;
  }
  const nEsperando = () => H.leads.filter(esperando).length;
  function abasHTML(){
    const n = H.loaded ? nEsperando() : 0;
    return `<nav class="fn-abas" role="tablist" aria-label="Hórus">${ABAS.map(([k, t, ic]) => `<button type="button" class="fn-aba" role="tab" id="fn-aba-${k}" aria-controls="hz-body" aria-selected="${H.aba === k}" data-act="fn-aba" data-k="${k}">${ico(ic)}<span>${t}</span>${k === 'entrada' ? `<b class="fn-aba-n" data-n="entrada"${n ? '' : ' hidden'}>${n}</b>` : ''}</button>`).join('')}</nav>`;
  }
  function badges(){
    const b = document.querySelector('.fn-aba-n[data-n="entrada"]'); if(!b) return;
    const n = nEsperando(); b.textContent = String(n); b.hidden = !n;
    /* mudou quem espera resposta: o menu (a Comanda) acompanha */
    if(F.nEsp != null && F.nEsp !== n && C.sinaisAtualiza) C.sinaisAtualiza();
    F.nEsp = n;
    b.setAttribute('aria-label', n === 1 ? '1 esperando resposta' : `${n} esperando resposta`);
  }
  async function vaiAba(k){
    if(!ABAS.some(a => a[0] === k)) return;
    H.aba = k; try{ localStorage.setItem(K_ABA, k); }catch(e){}
    try{ history.replaceState(null, '', location.pathname + location.search + '#/horus' + (k === 'radar' ? '' : '/' + k)); }catch(e){}
    document.querySelectorAll('.fn-aba').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === k)));
    if(k === 'radar'){ Z.corpoRadar(); return; }
    await pinta();
  }

  /* ---------- o funil ---------- */
  function noFunil(){
    const t = hoje(), ini = Z.addDays(-30);
    const por = { novo: [], contato: [], interesse: [], link: [], fechado: [] }, perd = [];
    H.leads.forEach(l => {
      if(l.st === 'perdido'){ if((perdeuEm(l) || '') >= ini) perd.push(l); return; }
      if(!por[l.st]) return;
      if(l.st === 'fechado' && (fechouEm(l) || '') < ini) return;
      por[l.st].push(l);
    });
    /* Novo: quem chegou sozinho ou entrou na mão primeiro, depois o mais quente (o resto mora no Radar) */
    por.novo.sort((a, b) => (ENTRA.concat('manual').includes(b.fonte) - ENTRA.concat('manual').includes(a.fonte)) || Z.heat(b) - Z.heat(a));
    ['contato', 'interesse', 'link'].forEach(k => por[k].sort((a, b) => (Z.isDue(b) - Z.isDue(a)) || valorDe(b).v - valorDe(a).v || Z.heat(b) - Z.heat(a)));
    por.fechado.sort((a, b) => String(fechouEm(b)).localeCompare(String(fechouEm(a))));
    perd.sort((a, b) => String(perdeuEm(b)).localeCompare(String(perdeuEm(a))));
    return { por, perd, t };
  }
  /* a taxa de cada etapa até fechar, na história da própria pessoa (decididos: fechou ou perdeu) */
  function chances(){
    const ch = Object.assign({}, CHANCE), dec = H.leads.filter(l => l.st === 'fechado' || l.st === 'perdido');
    ['contato', 'interesse', 'link'].forEach(k => {
      const L = dec.filter(l => chegou(l) >= IDX[k]); if(L.length < 5) return;
      const f = L.filter(l => l.st === 'fechado').length / L.length;
      ch[k] = Math.max(.03, Math.min(.95, f));
    });
    return ch;
  }
  function resumo(){
    const t = hoje(), mes = mesDe(t), ch = chances();
    const abertos = H.leads.filter(l => ['contato', 'interesse', 'link'].includes(l.st));
    const mesa = soma(abertos, true);
    const fechMes = H.leads.filter(l => l.st === 'fechado' && mesDe(fechouEm(l)) === mes);
    const fm = soma(fechMes, true);
    const prev = abertos.reduce((s, l) => s + valorDe(l, true).v * (ch[l.st] || 0), 0);
    const comV = H.leads.filter(l => l.st === 'fechado' && valorDe(l).v > 0);
    const ticket = comV.length ? comV.reduce((s, l) => s + valorDe(l).v, 0) / comV.length : 0;
    return { mesa, abertos: abertos.length, fm, nFech: fechMes.length, prev: { v: fm.v + prev, est: mesa.est || fm.est }, ticket, nTicket: comV.length, ch };
  }
  const MES_N = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function topoHTML(){
    const r = resumo(), m = MES_N[+hoje().slice(5, 7) - 1];
    const card = (t, v, s, cls) => `<div class="fn-num${cls ? ' ' + cls : ''}"><span class="fn-num-t">${t}</span><b class="num">${v}</b><small>${s}</small></div>`;
    return `<div class="fn-nums">
      ${card('Na mesa', reais(r.mesa), r.abertos ? `${r.abertos} ${r.abertos === 1 ? 'negócio aberto' : 'negócios abertos'}${r.mesa.sem ? ` · ${r.mesa.sem} sem valor` : ''}` : 'nenhum negócio aberto', 'mesa')}
      ${card(`Previsão de ${m}`, reais(r.prev), 'o fechado mais a chance de cada etapa')}
      ${card(`Fechou em ${m}`, reais(r.fm), r.nFech ? `${r.nFech} ${r.nFech === 1 ? 'negócio' : 'negócios'}` : 'nada ainda')}
      ${card('Ticket médio', r.ticket ? money(r.ticket) : '–', r.nTicket ? `de ${r.nTicket} ${r.nTicket === 1 ? 'venda' : 'vendas'} com valor` : 'põe o valor quando fechar')}
    </div>${r.mesa.est || r.prev.est ? '<p class="hz-help">~ é estimativa: cliente sem valor conta o "ganho por fechamento" do Placar. Toca no "+ valor" do cartão pra pôr o de verdade.</p>' : ''}`;
  }
  function proxTxt(l){
    if(l.st === 'fechado') return `<span class="fn-px">fechou ${C.ddmm(fechouEm(l) || hoje())}</span>`;
    if(l.st === 'perdido') return `<span class="fn-px">${esc(motivoDe(l) || 'perdido')} · ${C.ddmm(perdeuEm(l) || hoje())}</span>`;
    if(!l.prox) return '';
    const t = hoje();
    return l.prox < t ? `<span class="fn-px venceu">venceu ${C.ddmm(l.prox)}</span>` : l.prox === t ? '<span class="fn-px hoje">retorno hoje</span>' : `<span class="fn-px">retorno ${C.ddmm(l.prox)}</span>`;
  }
  function cartaoHTML(l){
    const h = Z.heat(l), temp = h ? Z.tempOf(h) : 'off', i = IDX[l.st], vd = valorDe(l), d = diasAqui(l);
    const ant = i != null && i > 0 ? COLS[i - 1] : null, prox = i != null && i < 4 ? COLS[i + 1] : null;
    /* no Novo, o nicho (ninguém tá "parado" ali); nas outras, há quanto tempo o cliente tá na etapa */
    const sub = [ENTRA.includes(l.fonte) ? `<em class="fn-or">${esc(ORIGEM[l.fonte])}</em>` : '',
      l.st === 'novo' ? esc([Z.nichoOf(l).n, l.bairro].filter(Boolean).join(' · ')) : l.st === 'fechado' || l.st === 'perdido' ? '' : d ? `${d} ${d === 1 ? 'dia' : 'dias'} aqui` : 'chegou hoje'].filter(Boolean).join(' · ');
    const aberto = l.st !== 'fechado' && l.st !== 'perdido';
    return `<li class="fn-card t-${temp}${esperando(l) ? ' espera' : ''}" data-id="${l.id}">
      <button type="button" class="fn-abre" data-act="hz-open" data-id="${l.id}" aria-label="${esc(Z.shortName(l.nome))}${vd.v ? ', ' + esc(money(vd.v)) : ''}. Abrir.">
        <span class="fn-nm"><i class="fn-t ${temp}" aria-hidden="true"></i><b>${esc(Z.shortName(l.nome))}</b></span>
        ${sub ? `<span class="fn-sub">${sub}</span>` : ''}${proxTxt(l)}
      </button>
      <div class="fn-pe">
        ${vd.v ? `<button type="button" class="fn-v num" data-act="fn-valor" data-id="${l.id}" title="${vd.de === 'venda' ? 'Do orçamento nas Vendas' : 'Valor do negócio'}">${money(vd.v)}${vd.de === 'venda' ? '<small>orçamento</small>' : ''}</button>`
          : temValor() && (aberto || l.st === 'fechado') ? `<button type="button" class="fn-v vazio" data-act="fn-valor" data-id="${l.id}">${ico('plus')} valor</button>` : '<span></span>'}
        ${l.st === 'perdido' ? `<button type="button" class="fn-seta" data-act="fn-mv" data-id="${l.id}" data-k="contato" aria-label="Voltar ${esc(Z.shortName(l.nome))} pra Contatado" title="Voltar pra Contatado">${ico('troca')}</button>`
          : `<span class="fn-setas">${ant ? `<button type="button" class="fn-seta" data-act="fn-mv" data-id="${l.id}" data-k="${ant[0]}" aria-label="Voltar ${esc(Z.shortName(l.nome))} pra ${ant[1]}" title="Voltar pra ${ant[1]}">‹</button>` : ''}${prox ? `<button type="button" class="fn-seta" data-act="fn-mv" data-id="${l.id}" data-k="${prox[0]}" aria-label="Passar ${esc(Z.shortName(l.nome))} pra ${prox[1]}" title="Passar pra ${prox[1]}">›</button>` : ''}</span>`}
      </div></li>`;
  }
  function colunaHTML(k, L, total){
    const s = soma(L, false), n = total != null ? total : L.length;
    const corte = k === 'novo' ? NOVO_MAX : COL_MAX, vis = L.slice(0, corte);
    const nome = k === 'fechado' ? 'Fechou' : NOME[k];
    return `<section class="fn-col c-${k}" data-st="${k}" aria-label="${nome}: ${n} ${n === 1 ? 'cliente' : 'clientes'}${s.v ? ', ' + money(s.v) : ''}">
      <header class="fn-ch"><h3>${nome}</h3><b class="fn-n">${n}</b>${s.v ? `<span class="fn-sum num">${money(s.v)}</span>` : ''}${k === 'fechado' ? '<small class="fn-ch-s">30 dias</small>' : ''}</header>
      ${vis.length ? `<ol class="fn-list">${vis.map(cartaoHTML).join('')}</ol>` : `<p class="fn-vazio">${k === 'novo' ? 'Ninguém novo. Caça no Radar.' : k === 'fechado' ? 'Fechou, arrasta pra cá.' : 'Arrasta um cliente pra cá.'}</p>`}
      ${k === 'novo' && n > vis.length ? `<button type="button" class="fn-mais" data-act="fn-aba" data-k="radar">+ ${n - vis.length} no Radar</button>` : k !== 'novo' && L.length > corte ? `<p class="fn-vazio">e mais ${L.length - corte}</p>` : ''}
    </section>`;
  }
  function perdidoHTML(perd){
    return `<section class="fn-col c-perdido${F.perdAberto ? ' aberto' : ''}" data-st="perdido" aria-label="Perdeu: ${perd.length} nos últimos 30 dias">
      <header class="fn-ch"><h3>Perdeu</h3><b class="fn-n">${perd.length}</b><small class="fn-ch-s">30 dias</small></header>
      <button type="button" class="fn-mais" data-act="fn-perd" aria-expanded="${F.perdAberto}">${F.perdAberto ? 'Esconder' : perd.length ? 'Ver quem' : 'Solta aqui quem não rolou'}</button>
      ${F.perdAberto && perd.length ? `<ol class="fn-list">${perd.slice(0, COL_MAX).map(cartaoHTML).join('')}</ol>` : ''}
    </section>`;
  }
  function funilHTML(){
    const { por, perd } = noFunil(), nNovo = H.leads.filter(l => l.st === 'novo').length;
    const vazio = !['contato', 'interesse', 'link', 'fechado'].some(k => por[k].length);
    return `${topoHTML()}
      ${vazio ? `<p class="hz-help fn-comeca">${H.leads.length ? 'O funil começa quando você fala com alguém: manda a primeira mensagem no Radar, ou arrasta um cliente do Novo pra frente.' : 'O funil começa quando entra o primeiro cliente: caça no Radar, põe na mão ou liga teu link de orçamento na Entrada.'}</p>` : ''}
      <div class="fn-board" id="fn-board">${COLS.map(([k]) => colunaHTML(k, por[k], k === 'novo' ? nNovo : null)).join('')}${perdidoHTML(perd)}</div>
      <p class="fn-dica">${matchMedia('(pointer: coarse)').matches ? 'Segura o cartão e arrasta pra outra etapa, ou usa as setinhas.' : 'Arrasta o cartão pra outra etapa, ou usa as setinhas.'} Toca no nome pra abrir o cliente.</p>
      <section class="hz-card" id="fn-rel"></section>`;
  }

  /* ---------- como o funil anda ---------- */
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const DICA = {
    1: 'Pouca gente responde. Testa outra abordagem (no Radar, a IA escreve uma sob medida) ou caça em outro nicho.',
    2: 'Quem se interessa não tá recebendo proposta. Manda no mesmo dia: Vendas › Novo orçamento já sai com o link pro cliente aprovar.',
    3: 'As propostas tão parando. Retoma em 2 dias e oferece uma condição pra fechar essa semana.'
  };
  function relHTML(){
    const L = H.leads, base = L.filter(l => chegou(l) >= 1);
    const passos = [1, 2, 3, 4].map(i => ({ i, n: L.filter(l => chegou(l) >= i).length }));
    const quedas = passos.slice(1).map((p, j) => ({ i: p.i - 1, t: pct(p.n, passos[j].n), de: passos[j].n })).filter(q => q.de >= 3);
    const pior = quedas.slice().sort((a, b) => a.t - b.t)[0];
    const maxP = Math.max(1, passos[0].n);
    /* de onde vem quem fecha */
    const OR = {};
    L.forEach(l => { const k = l.fonte || 'manual', o = OR[k] || (OR[k] = { k, n: 0, f: 0, v: 0 }); o.n++; if(l.st === 'fechado'){ o.f++; o.v += valorDe(l).v; } });
    const ors = Object.values(OR).sort((a, b) => b.f - a.f || b.v - a.v || b.n - a.n).slice(0, 7);
    const maxO = Math.max(1, ...ors.map(o => o.n));
    /* tempo até fechar (da entrada no Hórus ao fechou) */
    const tempos = L.filter(l => l.st === 'fechado' && l.created_at && fechouEm(l)).map(l => Math.max(0, daysBetween(dia(l.created_at), fechouEm(l)))).sort((a, b) => a - b);
    const mediana = tempos.length ? tempos[tempos.length >> 1] : null;
    const comV = L.filter(l => l.st === 'fechado' && valorDe(l).v > 0).map(l => valorDe(l).v), maior = comV.length ? Math.max(...comV) : 0;
    /* por que perde */
    const MO = {}; L.filter(l => l.st === 'perdido').forEach(l => { const m = motivoDe(l) || 'Sem motivo'; MO[m] = (MO[m] || 0) + 1; });
    const mos = Object.entries(MO).sort((a, b) => b[1] - a[1]).slice(0, 6), maxM = Math.max(1, ...mos.map(x => x[1]));
    const barra = (v, max) => `<span class="hz-vbar"><i style="width:${Math.round(v / max * 100)}%"></i></span>`;
    return `<div class="hz-h"><h2>Como teu funil anda</h2><span>desde o começo</span></div>
      ${base.length < 5 ? `<p class="hz-help">Com ${base.length} ${base.length === 1 ? 'cliente contatado' : 'clientes contatados'} os números ainda tão esquentando. Cada etapa que você muda deixa o relatório mais certo.</p>` : ''}
      <div class="hz-vgrid">
        <section class="hz-vcard"><h3>Do primeiro contato ao fechou</h3>
          <ol class="fn-esc">${passos.map((p, j) => `<li${pior && pior.i === j ? ' class="trava"' : ''}><span>${['Contatado', 'Interessado', 'Proposta', 'Fechou'][j]}</span>${barra(p.n, maxP)}<b class="num">${p.n}</b><small>${j ? `${pct(p.n, passos[j - 1].n)}%` : ''}</small></li>`).join('')}</ol>
          ${pior ? `<p class="hz-vdest">Onde mais trava: <b>de ${['Contatado', 'Interessado', 'Proposta'][pior.i]} pra ${['Interessado', 'Proposta', 'Fechou'][pior.i]}</b> (${pior.t}% passam). ${DICA[pior.i + 1]}</p>` : ''}</section>
        <section class="hz-vcard"><h3>De onde vem quem fecha</h3>
          ${ors.length ? `<div class="hz-vtab" role="table" aria-label="Clientes por origem"><div class="hz-vrow h" role="row"><span role="columnheader">Origem</span><span role="columnheader">Clientes</span><span role="columnheader">Fecharam</span><span role="columnheader">Em R$</span></div>
            ${ors.map(o => `<div class="hz-vrow" role="row"><span role="cell"><b>${esc(ORIGEM[o.k] || o.k)}</b>${barra(o.n, maxO)}</span><span role="cell" class="num">${o.n}</span><span role="cell" class="num">${o.f ? `${o.f} · ${pct(o.f, o.n)}%` : '0'}</span><span role="cell" class="num">${o.v ? money(o.v) : '–'}</span></div>`).join('')}</div>` : '<p class="hz-muted">Ainda sem clientes.</p>'}</section>
        <section class="hz-vcard"><h3>Tempo e ticket</h3>
          <div class="hz-vnum"><div><b class="num">${mediana != null ? `${mediana} ${mediana === 1 ? 'dia' : 'dias'}` : '–'}</b><small>pra fechar, no meio da tua lista${tempos.length ? ` (${tempos.length} ${tempos.length === 1 ? 'venda' : 'vendas'})` : ''}</small></div>
            <div><b class="num">${comV.length ? money(comV.reduce((s, v) => s + v, 0) / comV.length) : '–'}</b><small>ticket médio</small></div>
            <div><b class="num">${maior ? money(maior) : '–'}</b><small>o maior negócio</small></div></div></section>
        <section class="hz-vcard"><h3>Por que perde</h3>
          ${mos.length ? `<ol class="fn-esc mot">${mos.map(([m, n]) => `<li><span>${esc(m)}</span>${barra(n, maxM)}<b class="num">${n}</b></li>`).join('')}</ol>${mos[0][1] >= 3 && mos[0][0] !== 'Sem motivo' ? `<p class="hz-vdest">O que mais derruba: <b>${esc(mos[0][0])}</b>.</p>` : ''}`
            : '<p class="hz-muted">Nenhum perdido ainda. Quando marcar um, o Hórus pergunta o porquê.</p>'}</section>
      </div>`;
  }

  /* ---------- a Entrada ---------- */
  function linhaEntrada(l){
    const w = esperando(l), ped = oQuePediu(l), quando = quandoChegou(l), m = Z.nextMsg(l) || { k: 'interesse' };
    const txt = Z.compose(l, l.st === 'novo' ? 'abordagem' : (m.k || 'interesse'));
    const handle = l.fonte === 'corre' ? handleDe(l) : '';
    return `<li class="fn-in${w ? ' espera' : ''}">
      <div class="fn-in-t"><span class="fn-or-tag o-${esc(l.fonte)}">${esc(ORIGEM[l.fonte] || l.fonte)}</span>${w ? '<span class="fn-esp">esperando resposta</span>' : `<span class="fn-ok">${esc(Z.SN[l.st] || l.st)}</span>`}<span class="fn-quando">${quando ? esc(C.rel(quando)) : ''}</span></div>
      <button type="button" class="fn-in-nm" data-act="hz-open" data-id="${l.id}"><b>${esc(Z.shortName(l.nome))}</b>${ped ? `<span>${esc(ped.slice(0, 140))}</span>` : ''}</button>
      <div class="hz-row-acts">${Z.digits(l) ? `<a class="hz-btn${w ? ' pri' : ''}" href="${esc(Z.waUrl(l, txt))}" target="_blank" rel="noopener" data-act="hz-fire" data-id="${l.id}">${ico('wa')} ${w ? 'Responder' : 'WhatsApp'}</a>` : ''}${handle ? `<a class="hz-btn" href="#/msg/@${esc(handle)}">${ico('chat')} Conversa</a>` : ''}<button type="button" class="hz-btn ghost" data-act="hz-open" data-id="${l.id}">Abrir</button></div>
    </li>`;
  }
  function entradaHTML(){
    const L = H.leads.filter(l => ENTRA.includes(l.fonte)).sort((a, b) => (esperando(b) - esperando(a)) || String(quandoChegou(b) || '').localeCompare(String(quandoChegou(a) || '')));
    const n = L.filter(esperando).length, on = ((C.st.me || {}).horus || {}).orcamento === 'on';
    const sem30 = L.filter(l => (dia(quandoChegou(l)) || '') >= Z.addDays(-30)).length;
    const faixa = C.push && C.push.faixa ? C.push.faixa('horus') : '';
    return `<section class="hz-card"><div class="hz-h"><h2>Chegou sozinho</h2><span>${n ? `${n} esperando resposta` : `${sem30} nos últimos 30 dias`}</span></div>
        <p class="hz-help">Quem pede orçamento pelo teu link, te escolhe no Mural ou vira cliente numa conversa do Corre cai aqui. Responde rápido: quem responde primeiro fecha mais.</p>
        ${faixa}
        ${L.length ? `<ol class="fn-ins">${L.slice(0, F.entMais).map(linhaEntrada).join('')}</ol>${L.length > F.entMais ? `<button type="button" class="hz-btn ghost wide" data-act="fn-ent-mais">Mostrar mais ${Math.min(30, L.length - F.entMais)}</button>` : ''}`
          : `<p class="hz-muted">${on ? 'Ninguém chegou ainda. Põe teu link de orçamento na bio do Instagram, no status e no link na bio do Corre.' : 'Liga teu link de orçamento aqui embaixo: quem pedir cai aqui, com o pedido anotado, e o teu celular avisa na hora.'}</p>`}
      </section>
      <section class="hz-card" id="hz-orc"></section>
      <section class="hz-card fn-mais-g"><div class="hz-h"><h2>Mais gente chegando</h2></div>
        <ul class="fn-lista">
          <li><b>Link na bio do Corre:</b> o botão "Pedir orçamento" e o "Quero esse" da vitrine caem aqui. <a href="#/linkbio">Montar o link na bio</a></li>
          <li><b>Mural:</b> quem pede serviço na cidade escolhe uma proposta e vira cliente teu. <a href="#/mural">Abrir o Mural</a></li>
          <li><b>Mensagens:</b> conversou com alguém no Corre que quer comprar? Na conversa, toca em "Pôr no Hórus".</li>
        </ul></section>`;
  }

  /* ---------- pintar ---------- */
  async function pinta(){
    const body = C.$('hz-body'); if(!body || !C.$('hz-root')) return;
    badges();
    if(H.aba === 'funil'){
      await vendasCarrega();
      if(!C.$('hz-body') || H.aba !== 'funil') return;
      const x = window.scrollX, y = window.scrollY, sl = C.$('fn-board') ? C.$('fn-board').scrollLeft : 0;
      body.innerHTML = funilHTML();
      const rel = C.$('fn-rel'); if(rel) rel.innerHTML = relHTML();
      const b = C.$('fn-board'); if(b){ b.scrollLeft = sl; arrastaLiga(b); }
      window.scrollTo(x, y);
    } else if(H.aba === 'entrada'){
      body.innerHTML = entradaHTML();
      if(C.horusMax) C.horusMax.paint();
    }
  }

  /* ---------- mudar de etapa ---------- */
  async function mover(l, st, motivo){
    if(!l || l.st === st) return false;
    if(st === 'perdido' && motivo == null){ perdeuSheet(l); return false; }
    const antes = { st: l.st, prox: l.prox, hist: l.hist };
    l.st = st; Z.logH(l, 'st', `Etapa: ${Z.SN[st]}${motivo ? ' · ' + motivo : ''}`);
    if(Z.DONE.includes(st)) l.prox = null;
    else if(!l.prox || l.prox < hoje()) l.prox = Z.addDays(st === 'interesse' ? 1 : 2);
    if(!(await Z.save(l, ['st', 'prox', 'hist']))){ Object.assign(l, antes); pinta(); return false; }
    if(st === 'fechado') fechouSheet(l);
    else C.toast(`${Z.shortName(l.nome)}: ${st === 'perdido' ? 'perdido' : NOME[st] || Z.SN[st]}.`, 2400);
    Z.paint();
    return true;
  }

  /* ---------- o valor, o fechou e o perdeu ---------- */
  const lerReais = s => { const b = String(s || '').trim(); if(!b) return null; const v = C.catalogo && C.catalogo.parseReais ? C.catalogo.parseReais(b) : Number(b.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN; };
  const reaisTxt = v => Number(v) > 0 ? Number(v).toFixed(2).replace('.', ',') : '';
  async function gravaValor(l, v){
    if(v != null && (!(v >= 0) || v > 99999999.99)){ C.toast('Esse valor não deu. Até R$ 99.999.999,99.'); return false; }
    const antes = l.valor;
    l.valor = v == null || v === 0 ? null : v;
    try{ await C.api.upd('corre_leads', { id: l.id }, { valor: l.valor }); return true; }
    catch(e){
      l.valor = antes;
      if(e && (e.code === 'PGRST204' || /valor/.test(String(e.message || '')))){ F.semValor = true; C.toast('O valor de cada negócio ainda tá chegando no Corre. Por enquanto, vale o do orçamento nas Vendas.', 4200); }
      else C.toast(C.errMsg(e, 'Não deu pra salvar o valor.'));
      return false;
    }
  }
  function valorSheet(l){
    const vd = vendaDo(l);
    C.sheet(`<form class="form" id="fn-vf"><div class="sheet-head"><h2>Quanto vale o negócio?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Com <b>${esc(Z.shortName(l.nome))}</b>. Entra no funil, na previsão do mês e no ticket médio.</p>
      <div class="fld"><label for="fn-vv">Valor (R$)</label><input class="inp" id="fn-vv" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(reaisTxt(l.valor))}"></div>
      ${vd ? `<p class="hint">O orçamento nas Vendas dá ${esc(money(vd.total))}${Number(l.valor) > 0 ? '' : ': é o que vale enquanto você não põe outro'}.</p>` : ''}
      <div class="acts"><button type="submit" class="btn pri">Salvar</button>${Number(l.valor) > 0 ? '<button type="button" class="btn ghost" id="fn-vtira">Tirar o valor</button>' : ''}</div></form>`);
    const i = C.$('fn-vv'); setTimeout(() => { try{ i.focus(); }catch(e){} }, 60);
    C.umaVez(C.$('fn-vf'), async () => { const v = lerReais(i.value); if(Number.isNaN(v)){ C.toast('Escreve só o número, tipo 1.500,00.'); return; } if(await gravaValor(l, v)){ C.closeSheet(); C.toast(v ? `${Z.shortName(l.nome)}: ${money(v)}.` : 'Valor tirado.'); Z.paint(); } });
    const t = C.$('fn-vtira'); if(t) t.addEventListener('click', async () => { if(await gravaValor(l, null)){ C.closeSheet(); C.toast('Valor tirado.'); Z.paint(); } });
  }
  function fechouSheet(l){
    const nome = Z.shortName(l.nome), vd = valorDe(l);
    C.sheet(`<div class="form hz-won"><div class="sheet-head"><h2>Fechou com ${esc(nome)}!</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${temValor() ? `<div class="fld"><label for="fn-fv">Quanto fechou? (R$)</label><div class="seguir-row"><input class="inp" id="fn-fv" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(reaisTxt(Number(l.valor) > 0 ? l.valor : vd.v))}"><button type="button" class="btn sm" id="fn-fv-ok">Salvar</button></div><span class="hint">Entra no fechado do mês e no teu ticket médio.</span></div>` : ''}
      <p>Lança a venda: ela entra em "A receber" com a data do pagamento, e quando o dinheiro cair vira entrada na Grana e conta na tua meta.</p>
      <div class="acts">${C.negocio ? `<button type="button" class="btn pri" data-act="ng-novo" data-lead="${l.id}" data-st="fechado">${ico('recibo')} Lançar a venda</button>` : ''}<button type="button" class="btn" data-act="hz-portfolio" data-id="${l.id}">Pôr no Portfólio</button></div></div>`);
    const i = C.$('fn-fv'); if(!i) return;
    const salva = async () => { const v = lerReais(i.value); if(v == null || Number.isNaN(v) || v === (Number(l.valor) || 0)) return; if(await gravaValor(l, v)){ C.toast(`Fechou por ${money(v)}.`); Z.paint(); } };
    C.$('fn-fv-ok').addEventListener('click', salva);
    i.addEventListener('change', salva);
    i.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); salva(); } });
  }
  function perdeuSheet(l){
    let mot = '';
    C.sheet(`<form class="form" id="fn-pf"><div class="sheet-head"><h2>Por que não rolou com ${esc(Z.shortName(l.nome))}?</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="hz-chips fn-mot" role="group" aria-label="Motivo">${MOTIVOS.concat('Outro').map(m => `<button type="button" class="hz-chip light" data-m="${esc(m)}" aria-pressed="false">${esc(m)}</button>`).join('')}</div>
      <div class="fld" id="fn-pof" hidden><label for="fn-po">Qual?</label><input class="inp" id="fn-po" maxlength="40" placeholder="Em poucas palavras"></div>
      <p class="hint">O motivo entra no relatório do funil: perder várias vezes pelo mesmo motivo diz o que mudar.</p>
      <div class="acts"><button type="submit" class="btn pri">Marcar como perdido</button><button type="button" class="btn ghost" data-close>Cancelar</button></div></form>`);
    const f = C.$('fn-pf');
    f.querySelector('.fn-mot').addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if(!b) return;
      mot = b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.m;
      f.querySelectorAll('.fn-mot [data-m]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.m === mot)));
      C.$('fn-pof').hidden = mot !== 'Outro'; if(mot === 'Outro') C.$('fn-po').focus();
    });
    C.umaVez(f, async () => {
      const m = mot === 'Outro' ? String(C.$('fn-po').value || '').replace(/\s+/g, ' ').trim().slice(0, 40) : mot;
      C.closeSheet();
      await mover(l, 'perdido', m);
    });
  }

  /* ---------- arrastar (mouse: arrasta; dedo: segura um instante e arrasta) ---------- */
  const DR = { card: null, on: false, engole: 0 };
  function arrastaLiga(board){
    if(board.dataset.liga) return; board.dataset.liga = '1';
    board.addEventListener('pointerdown', e => {
      if(e.button > 0 || DR.on) return;
      const card = e.target.closest('.fn-card'); if(!card || e.target.closest('.fn-pe')) return;
      const r = card.getBoundingClientRect();
      solta(true);
      Object.assign(DR, { card, board, id: card.dataset.id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, toque: e.pointerType !== 'mouse', on: false, alvo: null, t: 0, raf: 0 });
      if(DR.toque) DR.t = setTimeout(() => ativa(), 320);
    });
    board.addEventListener('click', e => { if(Date.now() - DR.engole < 450){ e.preventDefault(); e.stopPropagation(); } }, true);
    board.addEventListener('contextmenu', e => { if(DR.card) e.preventDefault(); });
  }
  function ativa(){
    if(!DR.card || DR.on || !DR.card.isConnected) return;
    DR.on = true;
    const g = DR.card.cloneNode(true); g.classList.add('fn-ghost'); g.removeAttribute('data-id'); g.setAttribute('aria-hidden', 'true');
    g.style.width = DR.w + 'px'; document.body.appendChild(g); DR.g = g;
    DR.card.classList.add('fn-pega'); document.body.classList.add('fn-arrastando');
    try{ if(DR.toque && navigator.vibrate) navigator.vibrate(12); }catch(e){}
    poe(); DR.raf = requestAnimationFrame(rola);
  }
  function poe(){
    if(!DR.g) return;
    DR.g.style.transform = `translate(${DR.x - DR.dx}px, ${DR.y - DR.dy}px) rotate(2deg)`;
    const el = document.elementFromPoint(DR.x, DR.y), col = el && el.closest ? el.closest('.fn-col') : null;
    if(col !== DR.alvo){ if(DR.alvo) DR.alvo.classList.remove('fn-sobre'); DR.alvo = col; if(col && col.dataset.st !== (H.by[DR.id] || {}).st) col.classList.add('fn-sobre'); }
  }
  /* perto da beira, o quadro (e a página) rola sozinho */
  function rola(){
    if(!DR.on) return;
    const b = DR.board, r = b.getBoundingClientRect(), m = 56;
    if(DR.x < r.left + m) b.scrollLeft -= 14; else if(DR.x > r.right - m) b.scrollLeft += 14;
    if(DR.y < 70) window.scrollBy(0, -12); else if(DR.y > innerHeight - 70) window.scrollBy(0, 12);
    poe(); DR.raf = requestAnimationFrame(rola);
  }
  function solta(cancela){
    clearTimeout(DR.t); cancelAnimationFrame(DR.raf);
    const era = DR.on, alvo = DR.alvo, id = DR.id;
    if(DR.g) DR.g.remove();
    if(DR.card) DR.card.classList.remove('fn-pega');
    if(alvo) alvo.classList.remove('fn-sobre');
    document.body.classList.remove('fn-arrastando');
    Object.assign(DR, { card: null, on: false, g: null, alvo: null });
    if(!era || cancela) return;
    DR.engole = Date.now();
    const l = H.by[id], st = alvo && alvo.dataset.st;
    if(l && st && st !== l.st) mover(l, st);
  }
  document.addEventListener('pointermove', e => {
    if(!DR.card) return;
    DR.x = e.clientX; DR.y = e.clientY;
    const d = Math.hypot(e.clientX - DR.x0, e.clientY - DR.y0);
    if(!DR.on){
      if(DR.toque){ if(d > 10){ clearTimeout(DR.t); DR.card = null; } }
      else if(d > 6) ativa();
      return;
    }
    e.preventDefault(); poe();
  });
  document.addEventListener('pointerup', () => { if(DR.card) solta(false); });
  document.addEventListener('pointercancel', () => { if(DR.card) solta(true); });
  /* segurando o cartão com o dedo, a tela não rola por baixo */
  document.addEventListener('touchmove', e => { if(DR.on) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && DR.on){ e.stopPropagation(); solta(true); } }, true);

  /* ---------- mensagem do Corre vira cliente ---------- */
  function handleDe(l){
    const x = hist(l).find(r => r.k === 'cria' && /\(@[a-z0-9_.]+\)/i.test(r.v || ''));
    const m = x && String(x.v).match(/\(@([a-z0-9_.]+)\)/i); return m ? m[1].toLowerCase() : '';
  }
  async function daConversa(p){
    if(!p || !p.id) return;
    if(C.ferr && !C.ferr('horus')){ C.toast('Liga o Hórus primeiro (Perfil › Ferramentas).'); return; }
    const ref = 'corre:' + p.id;
    try{
      if(!H.loaded) await Z.load();
      const ja = H.leads.find(l => l.ref === ref);
      if(ja){ C.toast(`${Z.shortName(ja.nome)} já tá no Hórus.`); C.go('#/horus/entrada'); return; }
      const ph = p.whats_publico ? Z.phoneOf(p.whats_publico) : null, lu = Z.parseLugar(p.cidade || '');
      const ig = String(p.instagram || '').replace(/^@/, '').replace(/[^A-Za-z0-9_.]/g, '').slice(0, 30);
      await C.api.ins('corre_leads', { nome: String(p.nome || p.handle || 'Cliente').slice(0, 120), ref, fonte: 'corre', st: 'interesse', prox: hoje(),
        wa: ph ? ph.wa : '', fixo: ph ? ph.fixo : '', tel: ph ? ph.fmt : '', insta: ig, cidade: lu.cidade.slice(0, 60), uf: Z.UFN[lu.uf] ? lu.uf : '', nicho: '', bairro: '',
        obs: p.faz ? String('No Corre: ' + p.faz).slice(0, 1000) : '', hist: [{ t: new Date().toISOString(), k: 'cria', v: `Mensagem no Corre (@${p.handle})` }] });
      await Z.load();
      C.toast(`${Z.shortName(p.nome || p.handle)} entrou no Hórus como Interessado.`, 3200);
      C.go('#/horus/entrada');
    }catch(e){ C.toast(e && e.hint === 'horus_assinatura' ? 'O teste grátis do Hórus acabou. Assina em Financeiro › Planos pra pôr cliente novo.' : C.errMsg(e, 'Não deu pra pôr no Hórus.')); }
  }

  /* chegou pedido com o Corre aberto (o aviso do celular avisa a tela): relê e mostra */
  async function chegou_(){
    if(!C.$('hz-root')){ return; }
    try{ await Z.load(); }catch(e){ return; }
    if(H.aba === 'radar') Z.paint(); else pinta();
    badges();
  }

  /* ---------- ações ---------- */
  Object.assign(C.acts, {
    'fn-aba': el => vaiAba(el.dataset.k),
    'fn-mv': el => { const l = H.by[el.dataset.id]; if(l) mover(l, el.dataset.k); },
    'fn-valor': el => { const l = H.by[el.dataset.id]; if(l) valorSheet(l); },
    'fn-perd': () => { F.perdAberto = !F.perdAberto; pinta(); },
    'fn-ent-mais': () => { F.entMais += 30; pinta(); }
  });
  /* as setas do teclado mudam de aba (o jeito das abas) */
  document.addEventListener('keydown', e => {
    const t = e.target; if(!t || !t.classList || !t.classList.contains('fn-aba') || !/^Arrow(Left|Right)$/.test(e.key)) return;
    const i = ABAS.findIndex(a => a[0] === t.dataset.k), j = (i + (e.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length;
    e.preventDefault(); vaiAba(ABAS[j][0]).then(() => { const b = C.$('fn-aba-' + ABAS[j][0]); if(b) b.focus(); });
  });

  C.horusFunil = { abaDe, abas: abasHTML, badges, pinta, mover, fechou: fechouSheet, perdeu: perdeuSheet, valorSheet, daConversa, chegou: chegou_, temValor, valorDe, esperando, origem: l => ORIGEM[l.fonte] || '', handle: handleDe, ENTRA, motivoDe, _: { chegou, resumo, noFunil, chances, entrouEm } };
})();
