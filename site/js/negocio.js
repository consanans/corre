/* CORRE · VENDAS: do orçamento ao dinheiro na conta.
   Orçamento (com os itens do catálogo, link pro cliente ver e aprovar) → Fechado (a receber, com vencimento)
   → Pago (vira lançamento na Grana, conta na meta e no lucro). Todo cliente vira lead no Hórus (uma coisa só):
   orçamento mandado = Proposta (o Hórus lembra de retomar); fechou = Fechado.
   Clientes: quem já comprou, quanto rendeu, de quanto em quanto tempo volta, e quem sumiu.
   Tudo privado (corre_vendas, só a dona vê). O link do orçamento mostra só o que o cliente precisa ver. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const N = { vendas: [], leads: [], contas: [], est: null, tab: 'receber', uid: '', at: 0 };
  const FORMAS = [['pix', 'Pix'], ['dinheiro', 'Dinheiro'], ['cartao', 'Cartão'], ['transferencia', 'Transferência'], ['boleto', 'Boleto']];
  const FN = Object.fromEntries(FORMAS);
  const DIA = 864e5;

  const hoje = () => C.hojeBR();
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  /* mês que vem no dia fixo: 31/01 → 28/02 → 31/03 (o dia fixo não escorrega; mês curto usa o último dia) */
  const proxMes = (iso, dia) => { const [y, m] = String(iso).slice(0, 10).split('-').map(Number), ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1, fim = new Date(ny, nm, 0).getDate(); return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(Math.max(1, dia), fim)).padStart(2, '0')}`; };
  const diaDe = iso => Number(String(iso || '').slice(8, 10)) || 1;
  const dias = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / DIA);
  const dm = iso => iso ? C.ddmm(iso) : '';
  /* data de um carimbo de hora no fuso de Brasília (o created_at vem em UTC) */
  const diaBR = ts => { try{ return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts)); }catch(e){ return String(ts).slice(0, 10); } };
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  const digits = s => { let d = String(s || '').replace(/\D/g, ''); if(d.length > 11 && d.startsWith('55')) d = d.slice(2); return d; };
  const wa = (num, msg) => `https://wa.me/${num ? '55' + digits(num) : ''}?text=${encodeURIComponent(msg)}`;
  const linkOrc = cod => `${location.origin}${location.pathname}#/o/${cod}`;
  const soma = (vs, k) => vs.reduce((s, v) => s + Number(v[k] || 0), 0);
  const itemTxt = e => `${Number(e.q) === 1 && !e.u ? '' : `${String(e.q).replace('.', ',')}${e.u ? ' ' + e.u : '×'} `}${e.n}`;
  const resumo = v => (v.itens || []).map(e => e.n).join(', ').slice(0, 90) || 'venda';
  /* sinal: a parte que reserva a data. Recebido = tem sinal_em; o que falta é o total menos o sinal recebido */
  const temSinal = v => Number(v.sinal) > 0;
  const sinalOk = v => temSinal(v) && !!v.sinal_em;
  const falta = v => Math.max(Number(v.total || 0) - (sinalOk(v) ? Number(v.sinal) : 0), 0);
  const somaFalta = vs => vs.reduce((s, v) => s + falta(v), 0);
  /* o que entrou no mês: sinais recebidos no mês + o resto das vendas pagas no mês */
  const recebidoMes = ym => N.vendas.reduce((s, v) => s + (sinalOk(v) && String(v.sinal_em).slice(0, 7) === ym ? Number(v.sinal) : 0) + (v.st === 'pago' && String(v.pago_em || '').slice(0, 7) === ym ? falta(v) : 0), 0);
  const quando = (iso, pre) => { if(!iso) return ''; const d = dias(hoje(), iso); return d === 0 ? `${pre} hoje` : d === 1 ? `${pre} amanhã` : d > 0 ? `${pre} em ${d} dias (${dm(iso)})` : `${pre === 'vence' ? 'venceu' : 'era pra'} há ${-d} ${-d === 1 ? 'dia' : 'dias'} (${dm(iso)})`; };

  async function carregar(forca){
    if(!forca && N.uid === C.uid() && Date.now() - N.at < 20e3) return;
    const uid = C.uid();
    const [vs, ls, cs, es] = await Promise.all([
      C.api.q('corre_vendas', { eq: { dono: uid }, order: ['created_at', false], limit: 3000 }),
      C.api.q('corre_leads', { select: 'id,nome,wa,fixo,st,cidade,uf,fonte,prox,hist', eq: { dono: uid }, limit: 5000 }).catch(() => []),
      C.api.q('corre_contas', { eq: { dono: uid }, order: ['created_at', true] }).catch(() => []),
      C.api.one('corre_estilo', { eq: { dono: uid } }).catch(() => null),
      C.catalogo ? C.catalogo.carregar().catch(() => null) : null
    ]);
    Object.assign(N, { vendas: vs, leads: ls, contas: cs, est: es, uid, at: Date.now() });
  }
  const invalidar = () => { N.at = 0; };
  const aReceber = () => N.vendas.filter(v => v.st === 'fechado').sort((a, b) => String(a.vence || '9').localeCompare(String(b.vence || '9')));
  const orcamentos = () => N.vendas.filter(v => v.st === 'orcamento');
  const vencidas = () => aReceber().filter(v => v.vence && v.vence < hoje());

  /* clientes: tudo que foi pago, agrupado pelo lead (ou pelo nome) */
  function clientes(){
    const map = new Map();
    N.vendas.filter(v => v.st !== 'perdido' && (v.cliente || v.lead_id)).forEach(v => {
      const k = v.lead_id || 'n:' + C.norm(v.cliente);
      const c = map.get(k) || { k, nome: v.cliente || (N.leads.find(l => l.id === v.lead_id) || {}).nome || 'Cliente', whats: '', lead_id: v.lead_id || null, pagas: [], abertas: 0, fixo: false };
      if(v.whats && !c.whats) c.whats = v.whats;
      if(v.st === 'pago') c.pagas.push(v); else if(v.st === 'fechado') c.abertas += falta(v);
      if(v.recorrente) c.fixo = true;
      map.set(k, c);
    });
    return [...map.values()].map(c => {
      const ds = c.pagas.map(v => v.pago_em || String(v.created_at).slice(0, 10)).sort();
      const total = soma(c.pagas, 'total'), lucro = total - soma(c.pagas, 'custo'), ultima = ds[ds.length - 1] || '';
      const intervalo = ds.length >= 2 ? Math.round(dias(ds[0], ultima) / (ds.length - 1)) : 0;
      const sem = ultima ? dias(ultima, hoje()) : 0;
      const sumido = !c.fixo && ultima && ((intervalo && sem > intervalo * 1.5 && sem > 20) || (!intervalo && sem > 90));
      return Object.assign(c, { total, lucro, n: c.pagas.length, ticket: c.pagas.length ? total / c.pagas.length : 0, ultima, intervalo, sem, sumido });
    }).sort((a, b) => b.total - a.total || b.abertas - a.abertas);
  }

  /* ---------------- a tela ---------------- */
  /* v3.19: as vendas moram na página Corre, junto com a grana (#corre-vendas) */
  C.vendasPainel = {
    async montar(){
      await carregar(true);
      /* aba vazia não é jeito de chegar: vai pra onde tem coisa (a receber primeiro) */
      if((N.tab === 'orc' && !orcamentos().length) || (N.tab === 'receber' && !aReceber().length && orcamentos().length)) N.tab = aReceber().length ? 'receber' : orcamentos().length ? 'orc' : 'receber';
      pinta();
    }
  };
  /* dinheiro entrou pelas vendas: a grana e o "corre do mês" da mesma página se atualizam */
  const granaJunto = () => { if(C.granaPainel && C.$('corre-grana')) C.granaPainel.montar().catch(() => {}); if(C.correMes && C.$('g-corre')) C.correMes(C.$('g-corre')); };
  function pinta(){
    const box = C.$('corre-vendas'); if(!box) return;
    const ar = aReceber(), vc = vencidas(), os = orcamentos(), ym = hoje().slice(0, 7);
    const pagoMes = N.vendas.filter(v => v.st === 'pago' && String(v.pago_em || '').slice(0, 7) === ym);
    const cl = clientes();
    const tabs = [['receber', 'A receber', ar.length], ['orc', 'Orçamentos', os.length], ['clientes', 'Clientes', cl.length], ['hist', 'Histórico', 0]];
    box.innerHTML = `<div class="ng">
      <div class="sec-row corre-tit"><h2 class="sec-t"><span class="hl">Vendas</span></h2><span class="note">orçamento, a receber e clientes</span></div>
      <section class="card ng-top">
        <div class="ng-nums">
          <div><span>A receber</span><b class="num">${money(somaFalta(ar))}</b><small>${ar.length} ${ar.length === 1 ? 'venda' : 'vendas'}</small></div>
          <div class="${vc.length ? 'ng-alerta' : ''}"><span>Vencido</span><b class="num">${money(somaFalta(vc))}</b><small>${vc.length ? `${vc.length} pra cobrar` : 'nada atrasado'}</small></div>
          <div><span>Na mesa</span><b class="num">${money(soma(os, 'total'))}</b><small>${os.length} ${os.length === 1 ? 'orçamento' : 'orçamentos'}</small></div>
          <div class="hl-box"><span>Recebido em ${C.MESES_L[+ym.slice(5) - 1]}</span><b class="num">${money(recebidoMes(ym))}</b><small>${pagoMes.length ? `sobrou ${money(soma(pagoMes, 'total') - soma(pagoMes, 'custo'))} nas vendas pagas` : recebidoMes(ym) ? 'só de sinais, por enquanto' : 'nada ainda'}</small></div>
        </div>
        <div class="acts"><button type="button" class="btn pri" data-act="ng-novo">${ico('plus')} Novo orçamento</button><button type="button" class="btn" data-act="ng-novo" data-st="fechado">Venda fechada</button></div>
        ${!(C.catalogo && C.catalogo.lista().length) ? `<p class="fine">Dica: põe o que você vende no <a href="#/marcas">catálogo</a> e o orçamento sai com preço e custo em dois toques.</p>` : ''}
      </section>
      <div class="mu-tabs ng-tabs" role="tablist" aria-label="Vendas">${tabs.map(([k, n, q]) => `<button type="button" role="tab" data-act="ng-tab" data-k="${k}" aria-selected="${N.tab === k}">${n}${q ? ` <span class="ng-q">${q}</span>` : ''}</button>`).join('')}</div>
      <div id="ng-corpo">${corpo()}</div>
    </div>`;
  }
  function corpo(){
    if(N.tab === 'orc'){ const os = orcamentos(); return os.length ? `<ol class="ng-lista">${os.map(orcHTML).join('')}</ol>` : vazio('Nenhum orçamento na mesa.', 'Monta pelo catálogo e manda no WhatsApp com o link: o cliente vê, aprova, e a venda já cai em "A receber".'); }
    if(N.tab === 'clientes'){ const cl = clientes(); return cl.length ? `<ol class="ng-lista">${cl.map(cliHTML).join('')}</ol>` : vazio('Ninguém comprou ainda.', 'Quem fecha com você aparece aqui: quanto já rendeu, de quanto em quanto tempo volta e quem sumiu.'); }
    if(N.tab === 'hist'){ const hs = N.vendas.filter(v => v.st === 'pago' || v.st === 'perdido').sort((a, b) => String(b.pago_em || b.updated_at).localeCompare(String(a.pago_em || a.updated_at))).slice(0, 80); return hs.length ? `<ol class="ng-lista">${hs.map(histHTML).join('')}</ol>` : vazio('Sem histórico ainda.', 'Venda paga ou perdida fica guardada aqui.'); }
    const ar = aReceber();
    return ar.length ? `<ol class="ng-lista">${ar.map(recHTML).join('')}</ol>` : vazio('Nada pra receber.', 'Venda fechada entra aqui com a data de pagamento. O Corre avisa quando vence e escreve a cobrança.');
  }
  const vazio = (t, p) => `<div class="mu-vazio ng-vazio"><p><b>${esc(t)}</b></p><p>${esc(p)}</p><button type="button" class="btn" data-act="ng-novo">${ico('plus')} Novo orçamento</button></div>`;
  const itensLinha = v => `<p class="ng-itens">${(v.itens || []).map(e => esc(itemTxt(e))).join(' · ')}</p>`;
  const sinalLinha = v => !temSinal(v) ? '' : sinalOk(v) ? `<p class="ng-sinal ok">Sinal de <b class="num">${money(v.sinal)}</b> recebido ${dm(v.sinal_em)} · falta <b class="num">${money(falta(v))}</b></p>` : `<p class="ng-sinal">Sinal pra reservar: <b class="num">${money(v.sinal)}</b> · ainda não caiu</p>`;
  function recHTML(v){
    const atras = v.vence && v.vence < hoje();
    const rot = !temSinal(v) ? 'Recebi' : sinalOk(v) ? 'Recebi o resto' : 'Recebi o sinal';
    return `<li class="ng-it${atras ? ' atras' : ''}">
      <div class="ng-h"><button type="button" class="ng-nm" data-act="ng-editar" data-id="${v.id}"><b>${esc(v.cliente || 'Cliente')}</b></button><b class="num ng-v">${money(falta(v))}${sinalOk(v) ? `<small>de ${money(v.total)}</small>` : ''}</b></div>
      ${itensLinha(v)}${sinalLinha(v)}
      <p class="fine">${esc(v.vence ? quando(v.vence, 'vence') : 'sem data de pagamento')}${v.entrega ? ' · serviço ' + dm(v.entrega) : ''}${v.recorrente ? ' · todo mês' : ''}${v.forma ? ' · ' + esc(FN[v.forma] || v.forma) : ''}${v.aprovado_em ? ' · aprovou pelo link' : ''}</p>
      <div class="hz-row-acts"><button type="button" class="hz-btn pri" data-act="ng-recebi" data-id="${v.id}">${ico('grana')} ${rot}</button>${v.whats ? `<a class="hz-btn" href="${esc(wa(v.whats, cobranca(v)))}" target="_blank" rel="noopener">${ico('wa')} Cobrar</a>` : `<button type="button" class="hz-btn" data-act="ng-copiar" data-t="cobrar" data-id="${v.id}">${ico('copy')} Copiar cobrança</button>`}${v.lead_id && C.visitas ? `<button type="button" class="hz-btn" data-act="ng-agendar" data-id="${v.id}">${ico('cal')} Agendar</button>` : ''}<button type="button" class="hz-btn ghost" data-act="ng-editar" data-id="${v.id}">${ico('edit')} Editar</button></div>
    </li>`;
  }
  function orcHTML(v){
    const venc = v.validade && v.validade < hoje();
    return `<li class="ng-it orc${venc ? ' atras' : ''}">
      <div class="ng-h"><button type="button" class="ng-nm" data-act="ng-editar" data-id="${v.id}"><b>${esc(v.cliente || 'Cliente')}</b></button><b class="num ng-v">${money(v.total)}</b></div>
      ${itensLinha(v)}
      <p class="fine">${v.validade ? esc(venc ? `validade passou (${dm(v.validade)})` : `vale até ${dm(v.validade)}`) : 'sem validade'}${temSinal(v) ? ` · sinal ${money(v.sinal)}` : ''} · feito ${C.rel(v.created_at)}</p>
      <div class="hz-row-acts">${v.whats ? `<a class="hz-btn pri" href="${esc(wa(v.whats, textoOrc(v)))}" target="_blank" rel="noopener" data-act="ng-mandou" data-id="${v.id}">${ico('wa')} Mandar</a>` : `<button type="button" class="hz-btn pri" data-act="ng-copiar" data-t="orc" data-id="${v.id}">${ico('copy')} Copiar orçamento</button>`}
        <button type="button" class="hz-btn" data-act="ng-link" data-id="${v.id}">${ico('ext')} Link</button>
        <button type="button" class="hz-btn" data-act="ng-fechou" data-id="${v.id}">${ico('star')} Fechou</button>
        <button type="button" class="hz-btn ghost" data-act="ng-perdeu" data-id="${v.id}">Perdeu</button></div>
    </li>`;
  }
  function cliHTML(c){
    const tags = [c.fixo ? 'cliente fixo' : '', c.sumido ? `sumiu há ${c.sem} dias` : '', c.intervalo ? `volta a cada ~${c.intervalo} dias` : ''].filter(Boolean);
    const msg = c.sumido ? `Oi, ${primeiro(c.nome)}! Tudo bem? Faz um tempo que a gente não se fala. Tô com novidade por aqui, quer que eu te mande?` : `Oi, ${primeiro(c.nome)}! Tudo bem?`;
    return `<li class="ng-it cli${c.sumido ? ' sumido' : ''}">
      <div class="ng-h"><b>${esc(c.nome)}</b><b class="num ng-v">${money(c.total)}</b></div>
      <p class="fine">${c.n} ${c.n === 1 ? 'compra' : 'compras'}${c.n ? ` · ticket ${money(c.ticket)} · sobrou ${money(c.lucro)}` : ''}${c.ultima ? ` · última ${dm(c.ultima)}` : ''}${c.abertas ? ` · a receber ${money(c.abertas)}` : ''}</p>
      ${tags.length ? `<p class="ng-tags">${tags.map(t => `<span class="tag${/sumiu/.test(t) ? ' alerta' : ''}">${esc(t)}</span>`).join('')}</p>` : ''}
      <div class="hz-row-acts"><button type="button" class="hz-btn pri" data-act="ng-novo" data-lead="${esc(c.lead_id || '')}" data-cli="${esc(c.nome)}" data-wa="${esc(c.whats)}">${ico('plus')} Vender de novo</button>${c.whats ? `<a class="hz-btn" href="${esc(wa(c.whats, msg))}" target="_blank" rel="noopener">${ico('wa')} ${c.sumido ? 'Chamar de volta' : 'WhatsApp'}</a>` : ''}</div>
    </li>`;
  }
  const histHTML = v => `<li class="ng-it hist st-${v.st}"><div class="ng-h"><button type="button" class="ng-nm" data-act="ng-editar" data-id="${v.id}"><b>${esc(v.cliente || 'Cliente')}</b></button><b class="num ng-v">${money(v.total)}</b></div>${itensLinha(v)}<p class="fine">${v.st === 'pago' ? `pago ${dm(v.pago_em)}${v.forma ? ' · ' + esc(FN[v.forma] || '') : ''} · sobrou ${money(Number(v.total) - Number(v.custo))}` : 'perdido'}</p></li>`;

  /* ---------------- textos pro WhatsApp ---------------- */
  function textoOrc(v){
    const L = (v.itens || []).map(e => `• ${itemTxt(e)} — ${money(Number(e.q) * Number(e.v))}`);
    return [`Oi, ${primeiro(v.cliente)}! Segue o orçamento:`, ...L, Number(v.desconto) ? `Desconto: ${money(v.desconto)}` : '', `*Total: ${money(v.total)}*`,
      temSinal(v) ? `Pra reservar${v.entrega ? ` o dia ${dm(v.entrega)}` : ' a data'}: sinal de ${money(v.sinal)}${N.est && N.est.pix ? ` no Pix (${N.est.pix})` : ''}. O resto, ${money(Number(v.total) - Number(v.sinal))}, ${v.entrega ? 'no dia' : 'na entrega'}.` : '',
      [v.validade ? `Vale até ${dm(v.validade)}.` : '', v.entrega && !temSinal(v) ? `Entrega ${dm(v.entrega)}.` : ''].filter(Boolean).join(' '),
      `Pra ver e aprovar: ${linkOrc(v.codigo)}`].filter(Boolean).join('\n');
  }
  function cobranca(v){
    const pix = N.est && N.est.pix;
    const ab = temSinal(v) && !sinalOk(v)
      ? `Oi, ${primeiro(v.cliente)}! Pra garantir ${v.entrega ? `o dia ${dm(v.entrega)}` : 'a tua data'}, falta só o sinal de ${money(v.sinal)} (${resumo(v)}).`
      : `Oi, ${primeiro(v.cliente)}! Passando pra lembrar do ${sinalOk(v) ? 'restante' : 'pagamento'} de ${resumo(v)} (${money(falta(v))})${v.vence ? (v.vence < hoje() ? `, que venceu ${dm(v.vence)}` : `, que vence ${dm(v.vence)}`) : ''}.`;
    return [ab,
      pix ? `Pix: ${pix}` : '', `Detalhes: ${linkOrc(v.codigo)}`, 'Qualquer coisa, me chama. Obrigado!'].filter(Boolean).join('\n');
  }

  /* ---------------- o editor ---------------- */
  const E = { v: null, itens: [], lead_id: null };
  async function editor(v, pre){
    try{ await carregar(); }catch(e){}
    pre = pre || {};
    const novo = !v;
    v = v || { cliente: pre.cliente || '', whats: pre.whats || '', itens: [], desconto: 0, validade: addDias(hoje(), 7), entrega: null, vence: pre.st === 'fechado' ? hoje() : null, forma: '', obs: '', recorrente: false, st: pre.st || 'orcamento', lead_id: pre.lead_id || null };
    E.v = v; E.itens = (v.itens || []).map(e => Object.assign({}, e)); E.lead_id = v.lead_id || null;
    if(E.lead_id && !v.cliente){ const l = N.leads.find(x => x.id === E.lead_id); if(l){ v.cliente = l.nome; v.whats = v.whats || l.wa || l.fixo || ''; } }
    const cat = (C.catalogo && C.catalogo.lista()) || [];
    const nomes = Array.from(new Set(N.leads.map(l => l.nome).concat(N.vendas.map(x => x.cliente)).filter(Boolean))).slice(0, 400);
    const fechado = v.st !== 'orcamento';
    C.sheet(`<form class="form ng-f" id="ng-f" novalidate><div class="sheet-head"><h2>${novo ? (fechado ? 'Venda fechada' : 'Novo orçamento') : v.st === 'orcamento' ? 'Orçamento' : v.st === 'fechado' ? 'Venda a receber' : v.st === 'pago' ? 'Venda paga' : 'Venda perdida'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="row2"><div class="fld"><label for="ng-c">Cliente</label><input class="inp" id="ng-c" list="ng-cl" maxlength="120" value="${esc(v.cliente)}" placeholder="Nome ou empresa" autocomplete="off"${novo && !v.cliente ? ' autofocus' : ''}><datalist id="ng-cl">${nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
        <div class="fld"><label for="ng-w">WhatsApp</label><input class="inp" id="ng-w" inputmode="tel" value="${esc(v.whats || '')}" placeholder="(DDD) 9 9999-9999"></div></div>
      <div class="fld"><span class="lbl-s">Itens</span><ol class="ng-rows" id="ng-rows"></ol>
        ${cat.length ? `<div class="ng-cat" aria-label="Do catálogo">${cat.map(p => `<button type="button" class="chip add" data-act="ng-add" data-id="${p.id}">${ico('plus')} ${esc(p.nome)} <small class="num">${money(p.preco)}${p.unidade ? '/' + esc(p.unidade) : ''}</small></button>`).join('')}</div>` : ''}
        <button type="button" class="btn sm" data-act="ng-add">${ico('plus')} Item avulso</button></div>
      <div class="ng-tot" id="ng-tot"></div>
      <div class="row2"><div class="fld"><label for="ng-ds">Desconto (R$)</label><input class="inp num" id="ng-ds" inputmode="decimal" value="${Number(v.desconto) ? esc(C.catalogo.campo(v.desconto)) : ''}" placeholder="0,00"></div>
        <div class="fld ng-sn-f"><label for="ng-sn">Sinal pra reservar (R$) <small>opcional</small></label>${sinalOk(v)
          ? `<input class="inp num" id="ng-sn" value="${esc(C.catalogo.campo(v.sinal))}" disabled><span class="hint">Recebido ${dm(v.sinal_em)}. Já tá na Grana.</span>`
          : `<input class="inp num" id="ng-sn" inputmode="decimal" value="${Number(v.sinal) ? esc(C.catalogo.campo(v.sinal)) : ''}" placeholder="0,00"><span class="ng-sn-chips"><button type="button" class="chip sm" data-act="ng-sinal" data-p="30">30%</button><button type="button" class="chip sm" data-act="ng-sinal" data-p="50">50%</button></span>`}</div></div>
      <div class="row2"><div class="fld"><label for="ng-fm">Forma de pagamento</label><select class="inp" id="ng-fm"><option value="">A combinar</option>${FORMAS.map(([k, n]) => `<option value="${k}"${v.forma === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        ${!fechado || v.st === 'orcamento' ? `<div class="fld"><label for="ng-vd">Orçamento vale até</label><input class="inp" id="ng-vd" type="date" value="${esc(v.validade || '')}"></div>` : ''}</div>
      <div class="row2"><div class="fld"><label for="ng-en">Entrega / data do serviço</label><input class="inp" id="ng-en" type="date" value="${esc(v.entrega || '')}"></div>
        <div class="fld"><label for="ng-vc">Pagamento ${fechado ? 'vence' : 'previsto'}</label><input class="inp" id="ng-vc" type="date" value="${esc(v.vence || '')}"></div></div>
      <div class="fld"><label for="ng-ob">Observação <small>(o cliente vê)</small></label><textarea class="inp" id="ng-ob" rows="2" maxlength="600" placeholder="O que tá incluso, condições, sinal…">${esc(v.obs || '')}</textarea></div>
      <label class="switch"><input type="checkbox" id="ng-rc"${v.recorrente ? ' checked' : ''}><span class="sw"></span><span><b>Todo mês</b><small>Quando você marcar "Recebi", a cobrança do mês seguinte já entra em "A receber".</small></span></label>
      <div class="acts">${novo ? (fechado ? `<button type="submit" class="btn pri" data-st="fechado">Salvar venda</button>` : `<button type="submit" class="btn pri" data-st="orcamento">Salvar orçamento</button><button type="submit" class="btn" data-st="fechado">Já vendi</button>`)
        : `<button type="submit" class="btn pri" data-st="${esc(v.st)}">Salvar</button>${v.st === 'orcamento' ? `<button type="submit" class="btn" data-st="fechado">Fechou</button>` : ''}<button type="button" class="btn ghost" data-act="ng-apagar" data-id="${v.id}">${ico('trash')} Apagar</button>`}</div>
      ${!novo && v.codigo ? `<p class="fine">Link do cliente: <button type="button" class="linklike" data-act="ng-link" data-id="${v.id}">${esc(linkOrc(v.codigo).replace(/^https?:\/\//, ''))}</button></p>` : ''}
    </form>`);
    pintaItens();
    C.$('ng-f').addEventListener('input', e => { if(e.target.closest('#ng-rows') || e.target.id === 'ng-ds' || e.target.id === 'ng-sn') leItens(); });
    C.$('ng-c').addEventListener('change', () => { const l = N.leads.find(x => C.norm(x.nome) === C.norm(C.$('ng-c').value)); if(l){ E.lead_id = l.id; if(!C.$('ng-w').value) C.$('ng-w').value = l.wa || l.fixo || ''; } else E.lead_id = null; });
    C.umaVez(C.$('ng-f'), e => salvar(novo, (e.submitter && e.submitter.dataset.st) || v.st));
  }
  function pintaItens(){
    const box = C.$('ng-rows'); if(!box) return;
    box.innerHTML = E.itens.length ? E.itens.map((e, i) => `<li class="ng-row" data-i="${i}">
        <input class="inp ng-n" maxlength="80" value="${esc(e.n)}" placeholder="Item" aria-label="Item">
        <input class="inp num ng-q" inputmode="decimal" value="${esc(String(e.q).replace('.', ','))}" aria-label="Quantidade">
        <span class="ng-u">${esc(e.u || '×')}</span>
        <input class="inp num ng-p" inputmode="decimal" value="${esc(C.catalogo.campo(e.v))}" aria-label="Preço unitário">
        <button type="button" class="cbtn plain" data-act="ng-tira" data-i="${i}" aria-label="Tirar ${esc(e.n)}">${ico('x')}</button></li>`).join('')
      : '<li class="ng-row vazio">Escolhe do catálogo ou põe um item avulso.</li>';
    totais();
  }
  function leItens(){
    document.querySelectorAll('#ng-rows .ng-row[data-i]').forEach(r => {
      const e = E.itens[+r.dataset.i]; if(!e) return;
      e.n = r.querySelector('.ng-n').value.trim().slice(0, 80);
      e.q = C.catalogo.parseReais(r.querySelector('.ng-q').value) || 0;
      e.v = C.catalogo.parseReais(r.querySelector('.ng-p').value) || 0;
    });
    totais();
  }
  function totais(){
    const el = C.$('ng-tot'); if(!el) return;
    const sub = E.itens.reduce((s, e) => s + (Number(e.q) || 0) * (Number(e.v) || 0), 0), cus = E.itens.reduce((s, e) => s + (Number(e.q) || 0) * (Number(e.c) || 0), 0);
    const ds = C.$('ng-ds') ? C.catalogo.parseReais(C.$('ng-ds').value) : 0, tot = Math.round(Math.max(sub - ds, 0) * 100) / 100;
    const sn = Math.min(C.$('ng-sn') ? C.catalogo.parseReais(C.$('ng-sn').value) || 0 : 0, tot);
    el.innerHTML = `<span>Subtotal <b class="num">${money(sub)}</b></span>${ds ? `<span>Desconto <b class="num">− ${money(ds)}</b></span>` : ''}<span class="ng-total">Total <b class="num">${money(tot)}</b></span>${sn ? `<span class="ng-tot-sn">Sinal <b class="num">${money(sn)}</b> · resto <b class="num">${money(tot - sn)}</b></span>` : ''}${cus ? `<span class="fine">custo ${money(cus)} · sobra <b class="num">${money(tot - cus)}</b></span>` : ''}`;
    E.tot = tot;
    const rc = C.$('ng-rc'); if(rc && !rc.dataset.mexeu && E.itens.some(e => e.m)) rc.checked = true;
  }
  async function salvar(novo, st){
    leItens();
    const cliente = C.$('ng-c').value.trim().slice(0, 120), whats = digits(C.$('ng-w').value);
    const itens = E.itens.filter(e => e.n && Number(e.q) > 0).map(e => ({ p: e.p || null, n: e.n, q: Number(e.q), v: Number(e.v) || 0, c: Number(e.c) || 0, u: e.u || '' }));
    if(!cliente){ C.toast('Diz pra quem é.'); C.$('ng-c').focus(); return; }
    if(whats && whats.length !== 10 && whats.length !== 11){ C.toast('Confere o WhatsApp com DDD.'); C.$('ng-w').focus(); return; }
    if(!itens.length){ C.toast('Põe pelo menos um item.'); return; }
    const row = { cliente, whats, itens, desconto: C.catalogo.parseReais(C.$('ng-ds').value), forma: C.$('ng-fm').value, obs: C.$('ng-ob').value.trim().slice(0, 600),
      validade: C.$('ng-vd') ? C.$('ng-vd').value || null : E.v.validade || null, vence: C.$('ng-vc').value || null, entrega: C.$('ng-en').value || null, recorrente: C.$('ng-rc').checked, st };
    if(st === 'fechado' && !row.vence) row.vence = row.entrega && row.entrega >= hoje() ? row.entrega : hoje();
    /* todo mês: guarda o dia do vencimento (se a data não mudou, mantém o dia fixo de antes: a de fevereiro caiu no 28, mas o dia é 31) */
    row.dia_fixo = row.recorrente && row.vence ? (E.v && E.v.vence === row.vence && Number(E.v.dia_fixo) ? Number(E.v.dia_fixo) : diaDe(row.vence)) : null;
    const snEl = C.$('ng-sn');
    if(snEl && !snEl.disabled){
      /* v3.55: o total em centavos (3 x 19,90 dava 59,6999… e o sinal de 59,70 "passava do total") */
      const sn = C.catalogo.parseReais(snEl.value) || 0, tot = Math.round(Math.max(itens.reduce((s, e) => s + e.q * e.v, 0) - (row.desconto || 0), 0) * 100) / 100;
      if(sn > tot){ C.toast('O sinal passou do total.'); snEl.focus(); return; }
      row.sinal = sn;
    }
    try{
      /* todo cliente vira lead no Hórus (uma coisa só): orçamento = Proposta, vendido = Fechado */
      let lid = E.lead_id;
      /* acha o lead pelo WhatsApp primeiro (nome repetido não junta duas pessoas); só sem WhatsApp vai pelo nome */
      if(!lid && whats){ const l = N.leads.find(x => x.wa === whats || x.fixo === whats); if(l) lid = l.id; }
      if(!lid && !whats){ const l = N.leads.find(x => C.norm(x.nome) === C.norm(cliente)); if(l) lid = l.id; }
      /* venda perdida não vira "Fechado" no Hórus */
      const stL = st === 'orcamento' ? 'link' : ['fechado', 'pago'].includes(st) ? 'fechado' : null;
      if(!lid && stL){
        try{ const r = await C.api.ins('corre_leads', { nome: cliente, wa: whats.length === 11 ? whats : '', fixo: whats.length === 10 ? whats : '', tel: whats, st: stL, prox: st === 'orcamento' ? addDias(hoje(), 2) : null, fonte: 'venda', hist: [{ t: new Date().toISOString(), k: 'toque', v: st === 'orcamento' ? 'Orçamento: ' + resumo({ itens }) : 'Venda: ' + resumo({ itens }) }].slice(0, 1) }); lid = r[0] && r[0].id; }catch(e){ lid = null; }
      }else{
        const l = N.leads.find(x => x.id === lid);
        if(stL && l && l.st !== 'fechado' && (stL === 'fechado' || ['novo', 'contato', 'interesse'].includes(l.st))){ try{ await C.api.upd('corre_leads', { id: lid }, { st: stL, prox: stL === 'link' ? addDias(hoje(), 2) : null }); }catch(e){} }
      }
      row.lead_id = lid || null;
      if(novo) await C.api.ins('corre_vendas', row); else await C.api.upd('corre_vendas', { id: E.v.id }, row);
      if(C.horus && C.horus._ && C.horus._.H) C.horus._.H.loaded = false;
      C.closeSheet(); await carregar(true); N.tab = st === 'orcamento' ? 'orc' : st === 'fechado' ? 'receber' : N.tab;
      if(C.$('corre-vendas')) pinta(); else C.go('#/vendas');
      C.toast(novo ? (st === 'orcamento' ? 'Orçamento salvo. Manda no WhatsApp.' : 'Venda fechada. Tá em "A receber".') : 'Salvo.', 3200);
    }catch(err){ C.toast(/item/.test((err && (err.hint || err.message)) || '') ? 'Confere os itens: nome, quantidade e preço.' : C.errMsg(err)); }
  }

  /* ---------------- recebi: vira lançamento na Grana ---------------- */
  async function recebi(v){
    const pend = temSinal(v) && !sinalOk(v);
    C.sheet(`<form class="form" id="ng-rf"><div class="sheet-head"><h2>Recebi de ${esc(primeiro(v.cliente))}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${pend ? `<div class="seg3 ng-parte" role="radiogroup" aria-label="O que caiu"><label><input type="radio" name="ng-pt" value="sinal" checked><span>Só o sinal · <b class="num">${money(v.sinal)}</b></span></label><label><input type="radio" name="ng-pt" value="tudo"><span>Tudo · <b class="num">${money(v.total)}</b></span></label></div>`
        : `<p><b class="num">${money(falta(v))}</b>${sinalOk(v) ? ` · o resto (sinal de ${money(v.sinal)} já caiu ${dm(v.sinal_em)})` : ''} · ${esc(resumo(v))}</p>`}
      <div class="row2"><div class="fld"><label for="ng-rd">Data</label><input class="inp" id="ng-rd" type="date" value="${hoje()}"></div>
        <div class="fld"><label for="ng-rfm">Como</label><select class="inp" id="ng-rfm">${FORMAS.map(([k, n]) => `<option value="${k}"${(v.forma || 'pix') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>
      ${N.contas.length > 1 ? `<div class="fld"><label for="ng-rct">Caiu na conta</label><select class="inp" id="ng-rct">${N.contas.map(c => `<option value="${c.id}">${esc(c.apelido)}</option>`).join('')}</select></div>` : N.contas.length ? '' : '<p class="fine">Vou criar a "Conta do corre" na tua Grana pra guardar esse dinheiro. Dá pra trocar o nome depois.</p>'}
      <p class="fine">Entra na Grana como entrada do corre (com o cliente), conta na tua meta e no lucro. Se o mesmo valor vier depois no extrato do banco, o Corre junta e não duplica.</p>
      <div class="acts"><button type="submit" class="btn pri">${ico('grana')} Confirmar</button></div></form>`);
    C.$('ng-rf').addEventListener('submit', async e => {
      e.preventDefault(); const b = e.submitter || C.$('ng-rf').querySelector('button[type=submit]'); b.disabled = true;
      try{
        let conta = C.$('ng-rct') ? C.$('ng-rct').value : (N.contas[0] || {}).id;
        if(!conta){ const r = await C.api.ins('corre_contas', { apelido: 'Conta do corre', banco: 'Outro', cor: '#FFE800' }); conta = r[0].id; }
        const data = C.$('ng-rd').value || hoje(), forma = C.$('ng-rfm').value;
        const parte = pend ? ((document.querySelector('input[name="ng-pt"]:checked') || {}).value || 'sinal') : sinalOk(v) ? 'resto' : 'tudo';
        const valor = parte === 'sinal' ? Number(v.sinal) : parte === 'resto' ? falta(v) : Number(v.total);
        /* sinal de 100% (ou desconto depois do sinal): o resto é zero, então só marca como pago, sem lançar R$ 0 */
        const lc = Math.round(valor * 100) / 100 > 0 ? await C.api.ins('corre_lancamentos', { conta_id: conta, data, valor: Math.round(valor * 100) / 100, descricao: ((parte === 'sinal' ? 'Sinal: ' : parte === 'resto' ? 'Venda (resto): ' : 'Venda: ') + resumo(v)).slice(0, 140), cliente: String(v.cliente || '').slice(0, 60), origem: 'venda', categoria: 'venda', venda_id: v.id }) : [];
        if(parte === 'sinal'){
          await C.api.upd('corre_vendas', { id: v.id }, { sinal_em: data, sinal_lanc: lc[0] && lc[0].id, forma });
          if(C.estiloRepinta) C.estiloRepinta();
          C.closeSheet(); await carregar(true); pinta(); granaJunto(); C.toast(`Sinal recebido. Data garantida. Falta ${money(Number(v.total) - Number(v.sinal))}.`, 3800); return;
        }
        await C.api.upd('corre_vendas', { id: v.id }, { st: 'pago', pago_em: data, forma, lancamento_id: lc[0] && lc[0].id });
        let prox = '';
        if(v.recorrente){
          const base = v.vence || data, dia = Number(v.dia_fixo) || diaDe(base), nv = proxMes(base, dia);
          await C.api.ins('corre_vendas', { cliente: v.cliente, whats: v.whats, lead_id: v.lead_id, itens: v.itens, desconto: v.desconto, forma: v.forma, obs: v.obs, recorrente: true, st: 'fechado', vence: nv, dia_fixo: dia });
          prox = ` A de ${C.MESES_L[+nv.slice(5, 7) - 1]} já tá em "A receber".`;
        }
        if(v.lead_id){ try{ await C.api.upd('corre_leads', { id: v.lead_id }, { st: 'fechado' }); }catch(e){} }
        if(C.estiloRepinta) C.estiloRepinta();
        C.closeSheet(); await carregar(true); pinta(); granaJunto(); C.toast(`Recebido. Tá na Grana, aqui embaixo.${prox}`, 3800);
      }catch(err){ C.toast(C.errMsg(err)); b.disabled = false; }
    });
  }

  /* ---------------- o link do cliente (público) ---------------- */
  C.views.orcamentoVenda = async function(app, cod){
    app.innerHTML = `<main class="wrap ng-pub"><section class="card"><p>Abrindo o orçamento…</p></section></main>`;
    let o = null; try{ o = await C.api.rpc('corre_orcamento_ver', { p_codigo: cod }); }catch(e){ o = null; }
    if(!o){ app.innerHTML = `<main class="wrap ng-pub"><section class="card ng-doc"><h1>Não achei esse orçamento.</h1><p class="note">O link pode ter vindo cortado. Pede de novo pra quem te mandou.</p></section></main>`; return; }
    const de = o.de || {}, nome = primeiro(de.nome);
    document.title = `Orçamento de ${de.nome || 'Corre'}`;
    const sn = Number(o.sinal) || 0, resto = Math.max(Number(o.total) - sn, 0);
    const stTxt = { orcamento: o.validade && o.validade < hoje() ? `A validade passou (${dm(o.validade)}). Fala com ${nome} pra renovar.` : sn ? `Pra reservar${o.entrega ? ` o dia ${dm(o.entrega)}` : ' a data'}, o sinal é de ${money(sn)}. Aprova aqui e manda o comprovante pra ${nome}.` : '',
      fechado: `Aprovado${o.aprovado_em ? ' em ' + dm(diaBR(o.aprovado_em)) : ''}. ${sn && !o.sinal_pago ? `Falta o sinal de ${money(sn)} pra garantir a data.` : sn ? `Sinal recebido. Falta ${money(resto)}${o.vence ? ` até ${dm(o.vence)}` : ''}.` : o.vence ? `Pagamento ${o.vence < hoje() ? 'venceu' : 'até'} ${dm(o.vence)}.` : ''}`, pago: 'Pago. Obrigado!', perdido: 'Esse orçamento foi encerrado.' }[o.st] || '';
    const waDe = de.whats ? wa(de.whats, `Oi, ${nome}! Sobre o orçamento ${o.codigo}…`) : '';
    app.innerHTML = `<main class="wrap ng-pub"><section class="card ng-doc">
      <div class="ng-de">${C.avatar({ nome: de.nome, avatar_url: de.avatar_url }, 'm')}<div><span class="mono">Orçamento · ${esc(o.codigo)}</span><h1>${esc(de.nome || '')}</h1><p>${esc([de.faz, de.cidade].filter(Boolean).join(' · '))}</p></div></div>
      <p class="ng-pra">Pra <b>${esc(o.cliente || 'você')}</b> · ${dm(diaBR(o.created_at))}</p>
      <table class="ng-tab"><thead><tr><th>Item</th><th class="r">Qtd</th><th class="r">Valor</th></tr></thead><tbody>
        ${(o.itens || []).map(e => `<tr><td>${esc(e.n)}</td><td class="r num">${esc(String(e.q).replace('.', ','))}${e.u ? ' ' + esc(e.u) : ''}</td><td class="r num">${money(Number(e.q) * Number(e.v))}<small>${Number(e.q) !== 1 ? `${money(e.v)} cada` : ''}</small></td></tr>`).join('')}
      </tbody><tfoot>${Number(o.desconto) ? `<tr><td colspan="2">Desconto</td><td class="r num">− ${money(o.desconto)}</td></tr>` : ''}<tr class="ng-tt"><td colspan="2">Total${o.recorrente ? ' por mês' : ''}</td><td class="r num">${money(o.total)}</td></tr>${sn ? `<tr class="ng-sn-tr"><td colspan="2">Sinal pra reservar${o.sinal_pago ? ' <span class="tag">recebido</span>' : ''}</td><td class="r num">${money(sn)}</td></tr><tr><td colspan="2">Resto${o.entrega ? ' no dia' : ''}</td><td class="r num">${money(resto)}</td></tr>` : ''}</tfoot></table>
      <div class="ng-cond">${o.validade ? `<span><small>Vale até</small><b>${dm(o.validade)}</b></span>` : ''}${o.entrega ? `<span><small>${sn ? 'Dia marcado' : 'Entrega'}</small><b>${dm(o.entrega)}</b></span>` : ''}${o.forma ? `<span><small>Pagamento</small><b>${esc(FN[o.forma] || o.forma)}</b></span>` : ''}</div>
      ${o.obs ? `<p class="ng-obs">${esc(o.obs).replace(/\n/g, '<br>')}</p>` : ''}
      ${stTxt ? `<p class="ng-st st-${esc(o.st)}">${esc(stTxt)}</p>` : ''}
      ${o.pix ? `<div class="ng-pix"><span class="mono">Pix</span><code>${esc(o.pix)}</code><button type="button" class="btn sm" data-act="ng-pix" data-p="${esc(o.pix)}">${ico('copy')} Copiar</button></div>` : ''}
      <div class="acts">${o.st === 'orcamento' && !(o.validade && o.validade < hoje()) ? `<button type="button" class="btn pri" id="ng-ok">${ico('star')} Aprovar orçamento</button>` : ''}${waDe ? `<a class="btn" href="${esc(waDe)}" target="_blank" rel="noopener">${ico('wa')} Falar com ${esc(nome)}</a>` : ''}${de.publico ? `<a class="btn ghost" href="#/@${esc(de.handle)}">Ver o perfil</a>` : ''}</div>
      <p class="fine">Feito com o Corre.</p>
    </section></main>`;
    const ok = C.$('ng-ok');
    if(ok) ok.addEventListener('click', async () => {
      ok.disabled = true;
      try{ await C.api.rpc('corre_orcamento_aprovar', { p_codigo: o.codigo }); C.avisaPedido(); C.toast(`Aprovado! ${nome} já sabe.`, 3500); C.views.orcamentoVenda(app, o.codigo); }
      catch(err){ C.toast(/vencido/.test((err && (err.hint || err.message)) || '') ? 'A validade passou. Fala com quem te mandou.' : 'Não deu pra aprovar agora. Tenta de novo.'); ok.disabled = false; }
    });
  };

  /* ---------------- início ---------------- */
  C.home.push({ k: 'vendas', o: 0.7, async html(){
    try{ await carregar(); }catch(e){ return ''; }
    const ar = aReceber(), vc = vencidas(), os = orcamentos();
    if(!N.vendas.length) return `<a class="hcard vendas-mini" href="#/vendas"><div class="hc-top"><span class="hc-name">${ico('recibo')}Vendas</span><span class="mono">orçamento → dinheiro</span></div><p class="note">Monta o orçamento pelo teu catálogo, manda com link, e acompanha até cair na conta.</p><span class="hc-go">Fazer um orçamento ${ico('next')}</span></a>`;
    return `<a class="hcard vendas-mini" href="#/vendas">
      <div class="hc-top"><span class="hc-name">${ico('recibo')}Vendas</span><span class="mono">só você vê</span></div>
      <div class="hz-mini-nums"><div><b class="num ng-mini">${money(somaFalta(ar))}</b><span>a receber</span></div><div><b>${vc.length}</b><span>vencidas</span></div><div><b>${os.length}</b><span>na mesa</span></div></div>
      ${vc.length || ar.length ? `<ol class="mini-list">${(vc.length ? vc : ar).slice(0, 2).map(v => `<li><b>${esc(v.cliente)} · ${money(falta(v))}</b><small>${esc(quando(v.vence, 'vence') || 'sem data')}</small></li>`).join('')}</ol>` : ''}
      <span class="hc-go">Abrir as vendas ${ico('next')}</span>
    </a>`;
  } });

  /* ---------------- ações ---------------- */
  const achar = id => N.vendas.find(v => v.id === id);
  Object.assign(C.acts, {
    'ng-tab': el => { N.tab = el.dataset.k; document.querySelectorAll('.ng-tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === N.tab))); C.$('ng-corpo').innerHTML = corpo(); },
    'ng-novo': async el => {
      const d = (el && el.dataset) || {};
      let pre = { st: d.st || 'orcamento', lead_id: d.lead || null, cliente: d.cli || '', whats: d.wa || '' };
      if(pre.lead_id && !pre.cliente){ await carregar().catch(() => null); const l = N.leads.find(x => x.id === pre.lead_id) || (C.horus && C.horus._ && C.horus._.H.by && C.horus._.H.by[pre.lead_id]); if(l){ pre.cliente = l.nome; pre.whats = l.wa || l.fixo || ''; } }
      editor(null, pre);
    },
    'ng-editar': el => { const v = achar(el.dataset.id); if(v) editor(v); },
    'ng-add': el => {
      leItens();
      const p = el.dataset.id && C.catalogo.lista().find(x => x.id === el.dataset.id);
      E.itens.push(p ? { p: p.id, n: p.nome, q: 1, v: p.preco, c: p.custo, u: p.unidade || '', m: !!p.mensal } : { p: null, n: '', q: 1, v: 0, c: 0, u: '' });
      pintaItens(); const rs = document.querySelectorAll('#ng-rows .ng-row[data-i]'); const last = rs[rs.length - 1]; if(last) (p ? last.querySelector('.ng-q') : last.querySelector('.ng-n')).focus();
    },
    'ng-tira': el => { leItens(); E.itens.splice(+el.dataset.i, 1); pintaItens(); },
    'ng-recebi': el => { const v = achar(el.dataset.id); if(v) recebi(v); },
    'ng-fechou': async el => { const v = achar(el.dataset.id); if(!v) return; try{ await C.api.upd('corre_vendas', { id: v.id }, { st: 'fechado', vence: v.vence || (v.entrega && v.entrega >= hoje() ? v.entrega : hoje()) }); if(v.lead_id) await C.api.upd('corre_leads', { id: v.lead_id }, { st: 'fechado', prox: null }).catch(() => null); await carregar(true); N.tab = 'receber'; pinta(); C.toast('Fechou! Tá em "A receber". Ajusta a data do pagamento se precisar.', 3600); }catch(e){ C.toast(C.errMsg(e)); } },
    'ng-perdeu': async el => { const v = achar(el.dataset.id); if(!v) return; if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.textContent = 'Perdeu mesmo?'; return; } try{ await C.api.upd('corre_vendas', { id: v.id }, { st: 'perdido' }); if(v.lead_id) await C.api.upd('corre_leads', { id: v.lead_id }, { st: 'perdido', prox: null }).catch(() => null); await carregar(true); pinta(); C.toast('Anotado. Fica no histórico.'); }catch(e){ C.toast(C.errMsg(e)); } },
    'ng-mandou': el => { const v = achar(el.dataset.id); if(v && v.lead_id) C.api.upd('corre_leads', { id: v.lead_id }, { st: 'link', prox: addDias(hoje(), 2) }).catch(() => null); },
    'ng-link': el => { const v = achar(el.dataset.id); if(v) C.copy(linkOrc(v.codigo), 'Link do orçamento copiado.'); },
    'ng-copiar': el => { const v = achar(el.dataset.id); if(v) C.copy(el.dataset.t === 'cobrar' ? cobranca(v) : textoOrc(v), 'Copiado. Cola no WhatsApp.'); },
    'ng-pix': el => C.copy(el.dataset.p, 'Pix copiado.'),
    'ng-sinal': el => { leItens(); const t = E.tot || 0; if(!t){ C.toast('Põe os itens primeiro.'); return; } const x = t >= 20 ? Math.round(t * +el.dataset.p / 100) : Math.round(t * +el.dataset.p) / 100; C.$('ng-sn').value = C.catalogo.campo(x); totais(); },
    'ng-agendar': el => {
      const v = achar(el.dataset.id); if(!v || !v.lead_id || !C.visitas) return;
      const l = N.leads.find(x => x.id === v.lead_id) || { id: v.lead_id, nome: v.cliente };
      C.visitas.editor(null, null, { lead: Object.assign({}, l, { wa: l.wa || (digits(v.whats).length === 11 ? digits(v.whats) : ''), fixo: l.fixo || (digits(v.whats).length === 10 ? digits(v.whats) : '') }), pauta: resumo(v).slice(0, 60), dia: v.entrega || hoje() });
    },
    'ng-apagar': async el => { const v = achar(el.dataset.id); if(!v) return; if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Apagar mesmo?'; return; } try{ await C.api.del('corre_vendas', { id: v.id }); C.closeSheet(); await carregar(true); pinta(); C.toast('Apagado.'); }catch(e){ C.toast(C.errMsg(e)); } }
  });
  document.addEventListener('change', e => { if(e.target.id === 'ng-rc') e.target.dataset.mexeu = '1'; });

  C.negocio = { carregar, invalidar, clientes, editor, aReceber, vencidas, falta, dados: () => N };
})();
