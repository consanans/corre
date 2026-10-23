/* CORRE · ESTILO DE VIDA + O CORRE DO MÊS
   A pessoa monta quanto custa viver do jeito dela: blocos (Casa, Carro, Trampo…) com itens e valor por mês.
   O Corre faz a conta: (custo de vida + investimento) ÷ (1 − imposto) = quanto precisa entrar no mês.
   Na entrada do app aparece o que ainda falta, em vermelho, até o mês ser pago. Só a pessoa vê.
   A entrada do mês vem da Grana (lançamentos positivos do mês, todas as contas).

   Supabase (rodar uma vez):
     create table if not exists public.corre_estilo (
       id uuid primary key default gen_random_uuid(),
       dono uuid not null unique default auth.uid() references public.corre_perfis(id) on delete cascade,
       imposto numeric not null default 6,
       blocos jsonb not null default '{}'::jsonb,
       itens jsonb not null default '[]'::jsonb,
       created_at timestamptz not null default now(),
       updated_at timestamptz not null default now()
     );
     alter table public.corre_estilo enable row level security;
     create policy "estilo: só o dono" on public.corre_estilo for all
       using (dono = auth.uid()) with check (dono = auth.uid()); */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const TAB = 'corre_estilo';
  const CATS = [
    ['fixas', 'Fixas', 'Todo mês, o mesmo valor.'],
    ['variaveis', 'Variáveis', 'Todo mês, mas o valor muda.'],
    ['extras', 'Extras', 'Rolê, estilo e imprevisto.'],
    ['invest', 'Investindo', 'O que você guarda antes de gastar.']
  ];
  /* a lista pronta: blocos com os itens mais comuns, tudo zerado. A pessoa apaga o que não usa. */
  const MODELO = {
    fixas: [['Casa', ['Aluguel', 'Condomínio', 'Diarista']], ['Conexão', ['Internet', 'Plano de celular']], ['Saúde', ['Plano de saúde', 'Academia']],
      ['Carro', ['Parcela do carro', 'Seguro do carro', 'IPVA (por mês)']], ['Trampo', ['Canva / Adobe', 'Equipamento (parcela)', 'DAS / contador']],
      ['Educação', ['Escola', 'Curso']], ['Dívidas', ['Parcelas do cartão', 'Empréstimo']]],
    variaveis: [['Contas da casa', ['Luz', 'Água', 'Gás']], ['Mercado', ['Supermercado', 'Feira', 'Padaria']], ['Comer fora', ['Restaurantes', 'Delivery']],
      ['Transporte', ['Combustível', 'Uber / app', 'Estacionamento']], ['Saúde', ['Farmácia']], ['Cuidado pessoal', ['Cabelo / barba']]],
    extras: [['Lazer', ['Rolê', 'Viagens', 'Shows e jogos']], ['Estilo', ['Roupas', 'Tênis']], ['Assinaturas', ['Netflix', 'Spotify']],
      ['Imprevistos', ['Médico / dentista', 'Presentes', 'Imprevistos']]],
    invest: [['Reserva', ['Reserva de emergência']], ['Futuro', ['Previdência / longo prazo']], ['Objetivos', ['Objetivo do ano']]]
  };
  /* opções que aparecem no campo de adicionar de cada bloco */
  const SUGEST = {
    fixas: { 'Casa': ['IPTU', 'Seguro residencial', 'Mensalista', 'Manutenção da casa'], 'Conexão': ['TV / streaming de TV'], 'Saúde': ['Seguro de vida', 'Terapia', 'Pilates'],
      'Carro': ['Rastreador', 'Manutenção do carro'], 'Trampo': ['CapCut Pro', 'ChatGPT / IA', 'Meta Verified', 'Google Workspace / iCloud', 'Notion', 'Banco de imagens', 'Coworking', 'Freela de edição'],
      'Educação': ['Inglês', 'Material escolar'], 'Dívidas': ['Financiamento', 'Cheque especial'] },
    variaveis: { 'Mercado': ['Açougue', 'Hortifrúti'], 'Comer fora': ['Café', 'Lanche', 'Smash burger'], 'Transporte': ['Ônibus', 'Pedágio', 'Bike / patinete'],
      'Saúde': ['Suplementos'], 'Cuidado pessoal': ['Skincare', 'Manicure'], 'Contas da casa': ['Água mineral'] },
    extras: { 'Lazer': ['Cinema', 'Bar', 'Ingresso de jogo'], 'Estilo': ['Acessórios', 'Sneakers'], 'Assinaturas': ['YouTube Premium', 'Prime Video', 'Disney+', 'Max', 'Globoplay', 'Crunchyroll', 'DAZN', 'iCloud / Google One', 'PS Plus / Game Pass'],
      'Imprevistos': ['Pet', 'Doações', 'Conserto'] },
    invest: { 'Futuro': ['Tesouro / renda fixa', 'Ações e FIIs', 'Cripto'], 'Objetivos': ['Viagem', 'Troca de carro', 'Casa própria', 'Equipamento novo'] }
  };
  const E = { row: null, novo: false, t: 0, entrou: 0, armed: '', armedB: '', focus: '', meta: { dia: 0, dias: 'uteis', perfil: false } };

  /* ---------- números ---------- */
  const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtIn = v => (Number(v) ? nf.format(Number(v)) : '');
  const fmtPct = v => String(Math.round((Number(v) || 0) * 100) / 100).replace('.', ',');
  const mascara = s => C.oculto ? String(s).replace(/\d/g, '•') : s;
  function parseOne(k){
    let sg = 1;
    if(k[0] === '-'){ sg = -1; k = k.slice(1); } else if(k[0] === '+') k = k.slice(1);
    if(k.includes(',')) k = k.replace(/\./g, '').replace(',', '.');
    else if(/^\d{1,3}(\.\d{3})+$/.test(k)) k = k.replace(/\./g, '');
    if(!k || k === '.' || !/^\d*\.?\d*$/.test(k)) return null;
    return sg * Number(k);
  }
  /* aceita 1.234,56, 1234.56 e somas como 350+120 */
  function parseNum(raw){
    const s = String(raw).replace(/R\$|\s|%/g, '').replace(/−/g, '-');
    if(!s) return 0;
    if(!/^[-+]?[\d.,]+([+-][\d.,]+)*$/.test(s)) return null;
    let t = 0;
    for(const k of s.match(/[+-]?[\d.,]+/g)){ const v = parseOne(k); if(v === null) return null; t += v; }
    return Math.round(t * 100) / 100;
  }
  const soma = its => its.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  /* ---------- dados ---------- */
  function modelo(){
    const blocos = {}, itens = [];
    CATS.forEach(([cat]) => {
      blocos[cat] = MODELO[cat].map(b => b[0]);
      MODELO[cat].forEach(([g, nomes]) => nomes.forEach(nome => itens.push({ id: C.rid(), cat, grupo: g, nome, valor: 0 })));
    });
    return { imposto: 6, blocos, itens };
  }
  function norm(r){
    const blocos = {};
    CATS.forEach(([cat]) => { blocos[cat] = (r.blocos && Array.isArray(r.blocos[cat]) ? r.blocos[cat] : []).map(String).filter(Boolean); });
    const itens = (Array.isArray(r.itens) ? r.itens : []).map(i => ({ id: String(i.id || C.rid()), cat: CATS.some(c => c[0] === i.cat) ? i.cat : 'extras', grupo: String(i.grupo || ''), nome: String(i.nome || ''), valor: Number(i.valor) || 0 }));
    return { imposto: r.imposto == null ? 6 : Number(r.imposto) || 0, blocos, itens };
  }
  async function carregar(){
    /* depois da primeira leitura, a da memória vale (inclusive com edição ainda salvando) */
    if(E.row && E.uid === C.uid()) return E.row;
    const r = await C.api.one(TAB, { eq: { dono: C.uid() } });
    E.uid = C.uid();
    /* a linha pode existir só com o Pix/MEI (Grana): sem itens, ainda é estilo de vida novo */
    if(r && Array.isArray(r.itens) && r.itens.length){ E.row = norm(r); E.novo = false; } else { E.row = r ? Object.assign(modelo(), { imposto: r.imposto == null ? 6 : Number(r.imposto) || 0 }) : modelo(); E.novo = true; }
    E.horasMes = Number(r && r.horas_mes) || 160;
    E.meta = { dia: Number(r && r.meta_dia) || 0, dias: (r && r.meta_dias) || 'uteis', perfil: !!(r && r.meta_perfil) };
    return E.row;
  }
  function salvar(){
    E.novo = false;
    clearTimeout(E.t);
    E.t = setTimeout(async () => {
      E.t = 0;
      const row = JSON.parse(JSON.stringify({ dono: C.uid(), imposto: E.row.imposto, blocos: E.row.blocos, itens: E.row.itens, updated_at: new Date().toISOString() }));
      try{ await C.api.upsert(TAB, [row], 'dono'); }catch(e){ C.toast(C.errMsg(e, 'Não salvou agora. Tenta de novo.')); }
    }, 600);
  }
  async function entrouNoMes(){
    const ym = C.hojeBR().slice(0, 7);
    const ls = await C.api.q('corre_lancamentos', { eq: { dono: C.uid() }, gte: { data: ym + '-01' }, limit: 5000 });
    /* transferência entre as tuas contas não é dinheiro que entrou */
    return ls.filter(l => String(l.data).slice(0, 7) === ym && Number(l.valor) > 0 && l.categoria !== 'transferencia').reduce((s, l) => s + Number(l.valor), 0);
  }
  function conta(row){
    const T = {};
    CATS.forEach(([cat]) => { T[cat] = soma(row.itens.filter(i => i.cat === cat)); });
    const vida = T.fixas + T.variaveis + T.extras, t = Math.min(Math.max(Number(row.imposto) || 0, 0), 95) / 100;
    const precisa = (vida + T.invest) / (1 - t);
    return { T, vida, inv: T.invest, imposto: precisa * t, precisa };
  }
  function diasUteis(){
    const [y, m, d] = C.hojeBR().split('-').map(Number); let n = 0;
    for(let dt = new Date(y, m - 1, d); dt.getMonth() === m - 1; dt.setDate(dt.getDate() + 1)){ const w = dt.getDay(); if(w !== 0 && w !== 6) n++; }
    return n;
  }

  /* ---------- meta de venda por dia ---------- */
  const DIAS_META = [['uteis', 'Seg a sex', 'dias úteis'], ['seg_sab', 'Seg a sáb', 'dias de seg a sáb'], ['todos', 'Todo dia', 'dias']];
  /* dias de venda no mês: total, quantos já passaram (antes de hoje) e se hoje conta */
  function diasMeta(tipo){
    const [y, m, d] = C.hojeBR().split('-').map(Number); let total = 0, antes = 0, hoje = false;
    for(let dt = new Date(y, m - 1, 1); dt.getMonth() === m - 1; dt.setDate(dt.getDate() + 1)){
      const w = dt.getDay(), ok = tipo === 'todos' ? true : tipo === 'seg_sab' ? w !== 0 : w !== 0 && w !== 6;
      if(!ok) continue; total++;
      if(dt.getDate() < d) antes++; else if(dt.getDate() === d) hoje = true;
    }
    return { total, antes, hoje, restam: total - antes };
  }
  function metaConta(meta, entrou){
    const D = diasMeta(meta.dias), mes = meta.dia * Math.max(D.total, 1);
    const pct = mes > 0 ? entrou / mes * 100 : 0, ritmo = (D.antes + (D.hoje ? 1 : 0)) / Math.max(D.total, 1) * 100;
    const falta = Math.max(0, mes - entrou);
    return { D, mes, pct, ritmo, falta, porDia: D.restam ? falta / D.restam : falta };
  }
  const nomeDias = t => (DIAS_META.find(x => x[0] === t) || DIAS_META[0])[2];
  /* a barra: preenchimento = quanto já foi; o risquinho rosa = onde o mês está hoje */
  const barraMeta = (pct, ritmo, rotulo) => `<div class="mbar" role="img" aria-label="${esc(rotulo)}"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i><span class="tick" style="left:${Math.max(0, Math.min(100, ritmo)).toFixed(1)}%"></span></div>`;
  function metaHTML(entrou){
    const M = E.meta;
    if(!(M.dia > 0)) return `<button type="button" class="cm-meta-add" data-act="cm-meta">${ico('plus')} Pôr uma meta de venda por dia</button>`;
    const k = metaConta(M, entrou), mes = C.MESES_L[+C.hojeBR().slice(5, 7) - 1], p = Math.floor(k.pct), r = Math.round(k.ritmo);
    const st = p >= 100 ? 'Meta do mês batida.' : p >= r ? `À frente do mês: hoje o mês tá em ${r}%.` : `O mês tá em ${r}% e você em ${p}%.`;
    return `<div class="cm-meta">
      <div class="cm-meta-top"><span class="mono">Meta de venda</span><button type="button" class="lnk" data-act="cm-meta">${ico('edit')} Mudar</button></div>
      <p class="cm-meta-tx"><b class="num">${money(M.dia)}</b> por dia × ${k.D.total} ${nomeDias(M.dias)} = <b class="num">${money(k.mes)}</b> em ${mes}</p>
      ${barraMeta(k.pct, k.ritmo, `${p}% da meta de ${mes}. O mês está em ${r}%.`)}
      <p class="cm-meta-st"><b class="num">${p}%</b> da meta · ${esc(st)}${p < 100 && k.D.restam ? ` Pra bater: <b class="num">${money(k.porDia)}</b> por dia que falta (${k.D.restam}).` : ''}</p>
      ${M.perfil ? '<span class="tag sm">No teu perfil aparece só a barra e a %</span>' : ''}
    </div>`;
  }
  async function salvarMeta(meta){
    const row = { dono: C.uid(), meta_dia: meta.dia, meta_dias: meta.dias, meta_perfil: meta.perfil };
    /* primeira vez sem estilo de vida: salva junto a lista pronta, zerada, pra página do estilo abrir completa */
    if(E.novo) Object.assign(row, { imposto: E.row.imposto, blocos: E.row.blocos, itens: E.row.itens });
    await C.api.upsert(TAB, [JSON.parse(JSON.stringify(row))], 'dono');
    E.meta = meta; E.novo = false;
  }
  /* o que os outros módulos precisam: quanto o mês pede e quanto vale a hora (Catálogo: quanto cobrar) */
  C.estiloInfo = async () => {
    await carregar();
    const k = conta(E.row), precisa = E.novo ? 0 : k.precisa, horasMes = E.horasMes || 160;
    return { precisa, horasMes, valorHora: precisa > 0 ? Math.round(precisa / horasMes * 100) / 100 : 0 };
  };
  C.estiloEsquece = () => { E.row = null; E.uid = ''; };
  C.estiloRepinta = () => { const ev = C.$('ev-corre'); if(ev && E.row){ ev.innerHTML = heroHTML(E.row, false, E.entrou, true); if(C.vendas) C.vendas.ritmoHorus(ev); } };
  function repinta(){
    const ev = C.$('ev-corre'); if(ev) ev.innerHTML = heroHTML(E.row, false, E.entrou, true);
    ['h-corre', 'g-corre'].forEach(id => { const el = C.$(id); if(el) C.correMes(el); });
  }
  async function metaForm(){
    try{ await carregar(); }catch(e){}
    const M = E.meta, k = conta(E.row), tipo0 = M.dias || 'uteis';
    /* sugestões: o que o estilo de vida pede por dia de venda (e +30%), conforme os dias escolhidos */
    const sugDe = t => { const D = diasMeta(t); if(!(k.precisa > 0) || !D.total) return []; const v = Math.ceil(k.precisa / D.total); return [[v, 'o que teu estilo de vida pede'], [Math.ceil(v * 1.3 / 10) * 10, 'estilo de vida + 30%']]; };
    const sug = sugDe(tipo0);
    const v0 = M.dia > 0 ? M.dia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    C.sheet(`<form class="form" id="cm-mf"><div class="sheet-head"><h2>Meta de venda</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="cm-md">Quanto você quer vender por dia? (R$)</label><input class="inp num" id="cm-md" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${esc(v0)}" autofocus></div>
      ${sug.length ? `<div class="chips cm-sug">${sug.map(([v, t]) => `<button type="button" class="chip" data-v="${v}">${money(v)} <small>${esc(t)}</small></button>`).join('')}</div>` : ''}
      <div class="seg2" role="radiogroup" aria-label="Dias de venda">${DIAS_META.map(([v, t]) => `<label><input type="radio" name="cm-mt" value="${v}"${tipo0 === v ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <p class="cm-mres" id="cm-mres" aria-live="polite"></p>
      <label class="switch"><input type="checkbox" id="cm-mp"${M.perfil ? ' checked' : ''}><span class="sw"></span><span><b>Mostrar a barra da meta no meu perfil</b><small>Aparece só a porcentagem e onde o mês está. O valor da meta e o que entrou nunca aparecem.</small></span></label>
      <div class="acts"><button type="submit" class="btn pri">Salvar meta</button>${M.dia > 0 ? '<button type="button" class="btn" id="cm-mx">Tirar a meta</button>' : ''}</div>
    </form>`);
    const f = C.$('cm-mf'), inp = C.$('cm-md');
    const valor = () => { const v = parseNum(inp.value); return v && v > 0 ? v : 0; };
    const tipo = () => (f.querySelector('input[name="cm-mt"]:checked') || {}).value || 'uteis';
    const mostra = () => {
      const v = valor(), D = diasMeta(tipo()), mes = C.MESES_L[+C.hojeBR().slice(5, 7) - 1];
      sugDe(tipo()).forEach(([sv], i) => { const ch = f.querySelectorAll('.cm-sug .chip')[i]; if(ch && Number(ch.dataset.v) !== sv){ ch.dataset.v = sv; ch.firstChild.textContent = money(sv) + ' '; } });
      C.$('cm-mres').innerHTML = v ? `Dá <b class="num">${money(v * D.total)}</b> em ${mes} (${D.total} ${nomeDias(tipo())}).` : `Coloca um valor e o Corre faz a conta do mês.`;
    };
    f.addEventListener('input', mostra); f.addEventListener('change', mostra); mostra();
    f.querySelectorAll('.cm-sug .chip').forEach(b => b.addEventListener('click', () => { inp.value = Number(b.dataset.v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); mostra(); inp.focus(); }));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = valor(); if(!v){ C.toast('Coloca quanto quer vender por dia.'); inp.focus(); return; }
      try{ await salvarMeta({ dia: v, dias: tipo(), perfil: C.$('cm-mp').checked }); C.closeSheet(); repinta(); C.toast('Meta salva.'); }
      catch(err){ C.toast(C.errMsg(err, 'Não salvou agora. Tenta de novo.')); }
    });
    const x = C.$('cm-mx');
    if(x) x.addEventListener('click', async () => {
      try{ await salvarMeta({ dia: 0, dias: tipo(), perfil: false }); C.closeSheet(); repinta(); C.toast('Meta tirada.'); }
      catch(err){ C.toast(C.errMsg(err)); }
    });
  }

  /* ---------- o corre do mês (home, Grana e aqui) ---------- */
  function heroHTML(row, novo, entrou, aqui){
    const ym = C.hojeBR().slice(0, 7), mi = +ym.slice(5) - 1, mes = C.MESES_L[mi], k = conta(row);
    const top = `<div class="cm-top"><span class="mono">O corre de ${mes}</span>${aqui ? '' : `<a class="lnk" href="#/estilo">Estilo de vida ${ico('next')}</a>`}</div>`;
    if(novo || !(k.precisa > 0)){
      return `<section class="card cm vazio">${top}<b class="cm-q">Quanto custa teu estilo de vida?</b>
        <p class="note">${aqui ? 'Coloca o valor de cada item aqui embaixo. O número do mês aparece aqui em cima e na entrada do Corre.' : 'Coloca teus custos do mês e o Corre te mostra quanto falta fazer pra pagar tudo. Só você vê.'}</p>
        ${aqui ? '' : `<div class="acts"><a class="btn pri" href="#/estilo">${novo ? 'Montar meu estilo de vida' : 'Colocar os valores'}</a></div>`}
        ${metaHTML(entrou)}${vendeHTML(0, entrou, diasUteis())}</section>`;
    }
    const falta = k.precisa - entrou, pago = falta <= 0.004, dias = diasUteis(), pct = Math.max(0, Math.min(100, entrou / k.precisa * 100));
    return `<section class="card cm${pago ? ' pago' : ''}" aria-label="O corre de ${mes}">${top}
      <b class="cm-num num">${money(Math.abs(falta))}</b>
      <p class="cm-tx">${pago ? `Corre de ${mes} pago. É o que sobrou depois de bancar teu estilo de vida.` : `é o que falta fazer em ${mes} pra pagar teu estilo de vida.`}</p>
      <div class="cm-bar" role="img" aria-label="${esc(`Já entrou ${money(entrou)} de ${money(k.precisa)}`)}"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="cm-nums">
        <div><span>Teu estilo de vida pede</span><b class="num">${money(k.precisa)}<small>/mês</small></b></div>
        <div><span>Já entrou em ${C.MESES[mi]}</span><b class="num">${money(entrou)}</b>${/^#\/(grana|corre|vendas)/.test(location.hash) ? '' : '<small class="sub"><a href="#/grana">mudar na Grana</a></small>'}</div>
        ${!pago && dias ? `<div><span>Por dia útil</span><b class="num">${money(falta / dias)}</b><small class="sub">${dias} ${dias === 1 ? 'dia útil' : 'dias úteis'} até o fim do mês</small></div>` : ''}
      </div>
      ${metaHTML(entrou)}
      ${vendeHTML(k.precisa, entrou, dias)}
    </section>`;
  }
  /* quanto vender: o que falta no mês (estilo de vida ou meta de venda, o maior) virando número de vendas */
  function vendeHTML(precisa, entrou, dias){
    if(!C.vendas) return '';
    const fE = Math.max(0, (precisa || 0) - entrou), M = E.meta, fM = M.dia > 0 ? Math.max(0, metaConta(M, entrou).mes - entrou) : 0;
    if(!(precisa > 0) && !(M.dia > 0)) return '';
    const alvo = Math.max(fE, fM), rot = alvo <= 0 ? (precisa > 0 ? 'O estilo de vida do mês tá pago' : 'A meta do mês tá batida') : fM > fE ? 'pra bater a meta de venda' : 'pro teu estilo de vida';
    return C.vendas.resumoHTML({ alvo, rotulo: rot, dias: dias || diasUteis() });
  }
  /* pendura o card num elemento; opts.entrou evita buscar a Grana de novo */
  /* o número grande do corre do mês nunca quebra: se não cabe, encolhe até caber na largura do card */
  function cabe(){
    document.querySelectorAll('.cm-num').forEach(el => {
      el.style.fontSize = '';
      const box = el.parentElement; if(!box) return;
      const cs = getComputedStyle(box), livre = box.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      const largura = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
      if(livre > 0 && largura > livre + 1){ const fs = parseFloat(getComputedStyle(el).fontSize); el.style.fontSize = Math.max(22, Math.floor(fs * livre / largura * 0.97)) + 'px'; }
    });
  }
  let cabeRaf = 0; const cabeLogo = () => { if(cabeRaf) return; cabeRaf = requestAnimationFrame(() => { cabeRaf = 0; cabe(); }); };
  new MutationObserver(ms => { if(ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && ((n.matches && n.matches('.cm-num')) || (n.querySelector && n.querySelector('.cm-num')))))) cabeLogo(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', cabeLogo);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(cabeLogo);
  /* v4.33: o "Fala com o Corre" responde "quanto entrou esse mês" com a mesma conta do corre do mês */
  C.entrouNoMes = () => entrouNoMes();
  C.correMes = async function(el, opts){
    if(!el) return;
    try{
      const row = await carregar();
      const entrou = opts && opts.entrou != null ? opts.entrou : await entrouNoMes();
      if(C.vendas) await C.vendas.carregar().catch(() => null);
      if(document.body.contains(el)){ el.innerHTML = heroHTML(row, E.novo, entrou, false); if(C.vendas) C.vendas.ritmoHorus(el); }
    }catch(e){ el.innerHTML = ''; }
  };

  /* ---------- a página ---------- */
  function grupos(cat){
    const ordem = E.row.blocos[cat] || [], out = [], map = new Map(), sem = [];
    const pega = n => { if(!map.has(n)){ const o = { nome: n, itens: [] }; map.set(n, o); out.push(o); } return map.get(n); };
    ordem.forEach(pega);
    E.row.itens.forEach(i => { if(i.cat !== cat) return; if(i.grupo) pega(i.grupo).itens.push(i); else sem.push(i); });
    if(sem.length) out.unshift({ nome: '', itens: sem });
    return out;
  }
  function itemHTML(i){
    const on = E.armed === i.id;
    return `<li><input class="ev-in" value="${esc(i.nome)}" placeholder="Nome do item" maxlength="60" data-chg="ev-nome" data-id="${i.id}" aria-label="Nome do item">
      <input class="inp ev-iv num" value="${esc(mascara(fmtIn(i.valor)))}" placeholder="0,00" inputmode="decimal" autocomplete="off" data-chg="ev-valor" data-id="${i.id}" aria-label="${esc(i.nome || 'Item')}, valor por mês"${C.oculto ? ' disabled' : ''}>
      <button type="button" class="lnk ev-x${on ? ' armed' : ''}" data-act="ev-del" data-id="${i.id}" aria-label="${on ? 'Confirmar: apagar ' : 'Apagar '}${esc(i.nome || 'item')}">${on ? 'Apagar?' : ico('x')}</button></li>`;
  }
  function addHTML(cat, g, gi){
    const tem = new Set(E.row.itens.filter(i => i.cat === cat).map(i => C.norm(i.nome)));
    const base = g ? ((SUGEST[cat] || {})[g] || []) : Object.values(SUGEST[cat] || {}).flat();
    const ops = base.filter(n => !tem.has(C.norm(n))), id = `ev-dl-${cat}-${gi}`;
    return `<input class="inp ev-add" ${ops.length ? `list="${id}"` : ''} placeholder="+ adicionar${g ? ' em ' + esc(g) : ''}…" maxlength="60" autocomplete="off" data-chg="ev-add" data-cat="${cat}" data-g="${esc(g)}" aria-label="Adicionar item${g ? ' em ' + esc(g) : ''}">${ops.length ? `<datalist id="${id}">${ops.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>` : ''}`;
  }
  function blocoHTML(cat, g, gi){
    const on = E.armedB === cat + '|' + g.nome;
    return `<div class="ev-bloco">
      ${g.nome ? `<div class="ev-bh"><input class="ev-bn" value="${esc(g.nome)}" maxlength="40" data-chg="ev-bloco-nome" data-cat="${cat}" data-g="${esc(g.nome)}" aria-label="Nome do bloco"><span class="ev-bt num" data-e="b:${cat}:${gi}">${money(soma(g.itens))}</span>
        <button type="button" class="lnk ev-x${on ? ' armed' : ''}" data-act="ev-del-bloco" data-cat="${cat}" data-g="${esc(g.nome)}" aria-label="${on ? 'Confirmar: apagar o bloco ' : 'Apagar o bloco '}${esc(g.nome)}">${on ? `Apagar bloco${g.itens.length ? ` (${g.itens.length})` : ''}?` : ico('trash')}</button></div>` : ''}
      ${g.itens.length ? `<ul class="ev-itens">${g.itens.map(itemHTML).join('')}</ul>` : ''}
      ${addHTML(cat, g.nome, gi)}
    </div>`;
  }
  function render(){
    const app = C.$('app'), row = E.row, k = conta(row);
    app.innerHTML = C.header('estilo') + `<main class="wrap" id="ev-main">
      <div class="hello"><h1><span class="hl">Estilo de vida</span></h1><p>Só você vê. Quanto custa viver do teu jeito, todo mês.</p></div>
      <div id="ev-corre">${heroHTML(row, false, E.entrou, true)}</div>
      <section class="card"><h2 class="ch">A conta do mês</h2>
        <div class="ev-eq">
          <div><span>Custo de vida</span><b class="num" data-e="vida">${money(k.vida)}</b></div>
          <div><span>+ Investindo</span><b class="num" data-e="inv">${money(k.inv)}</b></div>
          <div><span>+ Imposto <input class="inp ev-pct num" value="${fmtPct(row.imposto)}" inputmode="decimal" autocomplete="off" data-chg="ev-pct" aria-label="Imposto, em porcentagem">%</span><b class="num" data-e="imp">${money(k.imposto)}</b></div>
          <div class="hl-box"><span>= Precisa fazer</span><b class="num" data-e="precisa">${money(k.precisa)}</b></div>
        </div>
        <p class="fine">Custo de vida mais investimento, dividido por (1 − imposto): é quanto precisa entrar bruto pra sobrar o que paga tudo. MEI paga DAS fixo: deixa o imposto em 0 e põe o DAS em Fixas › Trampo.</p>
      </section>
      <div class="ev-cats">${CATS.map(([cat, nome, sub]) => `<section class="card ev-cat">
        <div class="ch-row"><h2 class="ch">${nome}</h2><b class="ev-tot num" data-e="cat:${cat}">${money(k.T[cat])}</b></div>
        <p class="note">${sub}</p>
        ${grupos(cat).map((g, gi) => blocoHTML(cat, g, gi)).join('')}
        <button type="button" class="btn sm ghost ev-novo" data-act="ev-novo-bloco" data-cat="${cat}">${ico('plus')} Novo bloco</button>
      </section>`).join('')}</div>
      ${C.oculto ? '<p class="fine">Valores escondidos. Toca no olho lá em cima pra ver e editar.</p>' : ''}
      <p class="fine">Teu estilo de vida nunca aparece no perfil. O que já entrou vem da Grana: tudo que caiu nas tuas contas no mês.</p>
    </main>`;
    if(E.focus){ const f = document.querySelector(E.focus); E.focus = ''; if(f){ f.focus(); if(f.select) f.select(); } }
  }
  /* atualiza os números sem redesenhar (o foco continua onde tá) */
  function atualizar(){
    const k = conta(E.row), set = (key, v) => { const el = document.querySelector(`#ev-main [data-e="${key}"]`); if(el) el.textContent = money(v); };
    set('vida', k.vida); set('inv', k.inv); set('imp', k.imposto); set('precisa', k.precisa);
    CATS.forEach(([cat]) => { set('cat:' + cat, k.T[cat]); grupos(cat).forEach((g, gi) => set(`b:${cat}:${gi}`, soma(g.itens))); });
    const h = C.$('ev-corre'); if(h) h.innerHTML = heroHTML(E.row, false, E.entrou, true);
  }

  C.views.estilo = async function(app){
    app.innerHTML = C.header('estilo') + '<main class="wrap"><section class="card"><p>Abrindo teu estilo de vida…</p></section></main>';
    try{ await carregar(); E.entrou = await entrouNoMes(); if(C.vendas) await C.vendas.carregar().catch(() => null); }
    catch(e){ app.innerHTML = C.header('estilo') + `<main class="wrap"><section class="card"><p>${esc(C.errMsg(e, 'Não deu pra abrir agora.'))}</p></section></main>`; return; }
    E.armed = ''; E.armedB = '';
    render();
  };

  const item = id => E.row.itens.find(i => i.id === id);
  const sel = (cls, cat, g) => `#ev-main ${cls}[data-cat="${cat}"][data-g="${CSS.escape(g)}"]`;
  Object.assign(C.acts, {
    'cm-meta': () => metaForm(),
    'ev-nome': el => { const i = item(el.dataset.id); if(!i) return; const v = el.value.trim().slice(0, 60); if(v === i.nome) return; i.nome = v; salvar(); },
    'ev-valor': el => {
      const i = item(el.dataset.id); if(!i) return;
      const v = parseNum(el.value);
      if(v === null){ el.value = fmtIn(i.valor); C.toast('Não entendi esse valor. Usa 1.234,56 ou 350+120.'); return; }
      el.value = fmtIn(v); if(v === i.valor) return;
      i.valor = v; atualizar(); salvar();
    },
    'ev-pct': el => {
      const v = parseNum(el.value);
      if(v === null || v < 0 || v > 95){ el.value = fmtPct(E.row.imposto); C.toast('Imposto entre 0 e 95%.'); return; }
      el.value = fmtPct(v); if(v === E.row.imposto) return;
      E.row.imposto = v; atualizar(); salvar();
    },
    'ev-add': el => {
      const nome = el.value.trim().slice(0, 60); if(!nome) return;
      const cat = el.dataset.cat, g = el.dataset.g || '';
      const its = E.row.itens; let pos = its.length;
      for(let k = its.length - 1; k >= 0; k--){ if(its[k].cat === cat && its[k].grupo === g){ pos = k + 1; break; } }
      its.splice(pos, 0, { id: C.rid(), cat, grupo: g, nome, valor: 0 });
      E.focus = sel('.ev-add', cat, g);
      salvar(); render();
    },
    'ev-bloco-nome': el => {
      const cat = el.dataset.cat, velho = el.dataset.g, novo = el.value.trim().slice(0, 40);
      if(!novo){ el.value = velho; return; }
      if(novo === velho) return;
      const bl = E.row.blocos[cat], iv = bl.indexOf(velho);
      if(iv >= 0){ if(bl.includes(novo)) bl.splice(iv, 1); else bl[iv] = novo; } else if(!bl.includes(novo)) bl.push(novo);
      E.row.itens.forEach(i => { if(i.cat === cat && i.grupo === velho) i.grupo = novo; });
      salvar(); render();
    },
    'ev-del': el => {
      const id = el.dataset.id;
      if(E.armed !== id){ E.armed = id; E.armedB = ''; E.focus = `#ev-main [data-act="ev-del"][data-id="${id}"]`; render(); return; }
      E.armed = ''; E.row.itens = E.row.itens.filter(i => i.id !== id); salvar(); render();
    },
    'ev-del-bloco': el => {
      const cat = el.dataset.cat, g = el.dataset.g, key = cat + '|' + g;
      if(E.armedB !== key){ E.armedB = key; E.armed = ''; E.focus = sel('[data-act="ev-del-bloco"]', cat, g); render(); return; }
      E.armedB = '';
      E.row.itens = E.row.itens.filter(i => !(i.cat === cat && i.grupo === g));
      E.row.blocos[cat] = E.row.blocos[cat].filter(n => n !== g);
      salvar(); render();
    },
    'ev-novo-bloco': el => {
      const cat = el.dataset.cat, nomes = new Set([...E.row.blocos[cat], ...E.row.itens.filter(i => i.cat === cat).map(i => i.grupo)]);
      let nome = 'Novo bloco', n = 2; while(nomes.has(nome)) nome = `Novo bloco ${n++}`;
      E.row.blocos[cat].push(nome);
      E.focus = sel('.ev-bn', cat, nome);
      salvar(); render();
    }
  });

  /* Enter confirma; no valor, Enter já pula pro próximo item */
  document.addEventListener('keydown', e => {
    const t = e.target;
    if(e.key !== 'Enter' || !t.closest || !t.closest('#ev-main') || !t.matches('.ev-add, .ev-in, .ev-iv, .ev-bn, .ev-pct')) return;
    e.preventDefault();
    if(t.matches('.ev-iv')){ const all = [...document.querySelectorAll('#ev-main .ev-iv')], n = all[all.indexOf(t) + 1]; t.blur(); if(n) n.focus(); return; }
    t.blur();
  });
  document.addEventListener('focusin', e => { const t = e.target; if(t.matches && t.matches('#ev-main .ev-iv, #ev-main .ev-pct')) t.select(); });
  /* saiu da página com edição esperando: salva já */
  addEventListener('hashchange', () => { if(E.t){ clearTimeout(E.t); E.t = 0; salvarAgora(); } });
  async function salvarAgora(){
    const row = JSON.parse(JSON.stringify({ dono: C.uid(), imposto: E.row.imposto, blocos: E.row.blocos, itens: E.row.itens, updated_at: new Date().toISOString() }));
    try{ await C.api.upsert(TAB, [row], 'dono'); }catch(e){ C.toast(C.errMsg(e, 'Não salvou agora. Tenta de novo.')); }
  }
})();
