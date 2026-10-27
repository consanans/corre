/* CORRE · GRANA: até duas contas, lançamentos na mão ou pelo extrato do banco (OFX ou CSV),
   e quanto cada marca do portfólio tá rendendo. Só a pessoa vê; o perfil mostra só o que ela liberar.
   Dinheiro sempre em tinta preta: saída leva sinal de menos, nunca vermelho. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const BANCOS = ['Nubank', 'Inter', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'C6 Bank', 'Sicredi', 'Sicoob', 'PicPay', 'Mercado Pago', 'BTG', 'PagBank', 'Outro'];
  const CORES = ['#FFE800', '#FF48B0', '#FF6C2F', '#0067AE', '#765BA7', '#141216'];
  const G = { contas: [], lanc: [], marcas: [], vendas: [], est: null, mes: C.hojeBR().slice(0, 7), conta: '', armed: '' };
  /* categorias: pra onde vai o dinheiro (o que é do negócio e o que é da casa) */
  const CAT_SAI = [['insumo', 'Insumo'], ['ferramenta', 'Ferramentas'], ['anuncio', 'Anúncio'], ['transporte', 'Transporte'], ['taxa', 'Taxas'], ['equipe', 'Equipe'], ['imposto', 'Impostos'], ['pessoal', 'Casa e pessoal'], ['outro', 'Outro']];
  const CAT_ENT = [['venda', 'Venda do corre'], ['outra', 'Outra entrada']];
  /* transferência entre as tuas contas: não é entrada nem saída do corre (some do Entrou, do Saiu, do perfil, do MEI e da meta) */
  const TRANSF = 'transferencia', TRANSF_N = 'Entre minhas contas';
  const ehTr = l => !!l && l.categoria === TRANSF, semTr = ls => ls.filter(l => !ehTr(l));
  const CN = Object.assign(Object.fromEntries(CAT_SAI.concat(CAT_ENT)), { [TRANSF]: TRANSF_N });
  const DO_NEGOCIO = ['insumo', 'ferramenta', 'anuncio', 'transporte', 'taxa', 'equipe', 'imposto'];
  const CAT_RE = [['imposto', /\bDAS\b|SIMPLES NAC|DARF|RECEITA FED|\bINSS\b|PGMEI/i], ['anuncio', /FACEBK|FACEBOOK|META ?ADS|GOOGLE ?ADS|ADS ?GOOGLE|TIKTOK/i],
    ['taxa', /TARIFA|\bTAXA|\bIOF\b|ANUIDADE|STONE|CIELO|GETNET|PAGSEGURO|SUMUP|INFINITEPAY/i], ['transporte', /UBER|\b99\b|POSTO|COMBUST|SHELL|IPIRANGA|PETROBRAS|ESTACION|PED[AÁ]GIO|SEM PARAR|VELOE/i],
    ['ferramenta', /CANVA|ADOBE|NOTION|OPENAI|CHATGPT|CAPCUT|HOSTINGER|REGISTRO\.BR|SHOPIFY|GOOGLE ?(ONE|WORKSPACE)|MICROSOFT|FIGMA|ENVATO/i],
    ['insumo', /ATACAD|ASSA[IÍ]|MAKRO|DISTRIBUID|EMBALAG|PAPELARIA|KALUNGA|MADEIR|MATERIA|MERCADO ?LIVRE|SHOPEE|ALIEXPRESS|AMAZON/i],
    ['pessoal', /IFOOD|RAPPI|SUPERMERC|MERCADO|PADARIA|FARM[AÁ]CIA|DROGA|NETFLIX|SPOTIFY|ALUGUEL|CONDOM|COPEL|SANEPAR|CEMIG|ENEL|SABESP|\bVIVO\b|\bCLARO\b|\bTIM\b/i]];
  const catGuess = l => l.categoria || (Number(l.valor) > 0 ? (l.cliente || l.venda_id ? 'venda' : '') : ((CAT_RE.find(([, re]) => re.test(l.descricao || '')) || [])[0] || ''));
  /* MEI 2026: DAS = 5% do salário mínimo (R$ 1.621 → R$ 81,05) + R$ 1 de ICMS (comércio) e/ou R$ 5 de ISS (serviço) */
  const DAS = { comercio: 82.05, servicos: 86.05, ambos: 87.05 };

  /* acha transferência: o mesmo valor saindo de uma conta e entrando na outra em até 2 dias, com cara de transferência
     (o teu nome numa das descrições, ou os dois lados dizendo PIX/TED/TRANSF no mesmo dia). Venda e entrada com cliente ficam fora. */
  const TR_RE = /TRANSF|\bPIX\b|\bTED\b|\bDOC\b|MESMA TITULAR|ENTRE CONTAS|APLICA[CÇ]|RESGATE/i;
  function meuNome(){ const t = C.norm((C.st.me && C.st.me.nome) || '').split(/\s+/).filter(w => w.length >= 3 && !['dos', 'das', 'des'].includes(w)); return t.length >= 2 ? [t[0], t[1]] : null; }
  const temNome = (d, nm) => { if(!nm) return false; const n = C.norm(d); return n.includes(nm[0]) && n.includes(nm[1]); };
  function paresTransf(ls){
    const nm = meuNome(), livres = ls.filter(l => !ehTr(l) && !l.cliente && !l.venda_id && l.origem !== 'venda' && l.conta_id && Number(l.valor));
    const grupos = new Map();
    livres.forEach(l => { const k = Math.round(Math.abs(Number(l.valor)) * 100); if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(l); });
    const usados = new Set(), pares = [];
    for(const g of grupos.values()){
      const sai = g.filter(l => Number(l.valor) < 0), ent = g.filter(l => Number(l.valor) > 0);
      if(!sai.length || !ent.length) continue;
      for(const a of sai){
        let melhor = null, md = 9;
        for(const b of ent){
          if(usados.has(b) || b.conta_id === a.conta_id) continue;
          const dd = Math.abs(Date.parse(String(b.data).slice(0, 10)) - Date.parse(String(a.data).slice(0, 10))) / 864e5;
          if(dd > 2) continue;
          const forte = temNome(a.descricao, nm) || temNome(b.descricao, nm) || (dd === 0 && TR_RE.test(a.descricao || '') && TR_RE.test(b.descricao || ''));
          if(forte && dd < md){ md = dd; melhor = b; }
        }
        if(melhor){ usados.add(a); usados.add(melhor); pares.push([a, melhor]); }
      }
    }
    return pares;
  }
  const DISPENSA_K = 'corre-grana-tr-nao';
  const dispensadas = () => { try{ return new Set(JSON.parse(localStorage.getItem(DISPENSA_K) || '[]')); }catch(e){ return new Set(); } };
  function sugestoesTransf(){ const nao = dispensadas(); return paresTransf(G.lanc).filter(([a, b]) => !nao.has(a.id) && !nao.has(b.id)); }

  const mesNome = ym => { const [y, m] = ym.split('-'); return `${C.MESES_L[+m - 1]} ${y}`; };
  const addMes = (ym, k) => { let [y, m] = ym.split('-').map(Number); m += k; while(m < 1){ m += 12; y--; } while(m > 12){ m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
  /* v3.55: mês que a tela consegue mostrar (o Corre carrega os últimos 12) */
  const noAlcance = ym => { const ini = addMes(C.hojeBR().slice(0, 7), -11); return ym < ini ? ini : ym; };
  const doMes = (ls, ym) => ls.filter(l => String(l.data).slice(0, 7) === ym);
  const soma = ls => ls.reduce((s, l) => s + Number(l.valor), 0);
  const sinal = v => (v < 0 ? '− ' : '') + money(Math.abs(v));

  async function carregar(){
    const uid = C.uid(), desde = addMes(C.hojeBR().slice(0, 7), -11) + '-01';
    const [contas, lanc, marcas, vendas, est] = await Promise.all([
      C.api.q('corre_contas', { eq: { dono: uid }, order: ['created_at', true] }),
      C.api.q('corre_lancamentos', { eq: { dono: uid }, gte: { data: desde }, order: ['data', false], limit: 5000 }),
      C.api.q('corre_portfolio', { eq: { dono: uid }, order: ['ordem', true] }),
      C.api.q('corre_vendas', { eq: { dono: uid, st: 'pago' }, limit: 3000 }).catch(() => []),
      C.api.one('corre_estilo', { eq: { dono: uid } }).catch(() => null)
    ]);
    G.contas = contas; G.lanc = lanc; G.marcas = marcas; G.vendas = vendas; G.est = est;
  }
  C.granaDados = async () => { await carregar(); return G; };

  /* ---------- leitura de extrato ---------- */
  async function lerArquivo(file){
    const buf = await file.arrayBuffer(), head = new TextDecoder('latin1').decode(buf.slice(0, 600));
    if(/CHARSET:\s*1252|ENCODING:\s*USASCII|windows-1252|iso-8859-1/i.test(head)) return new TextDecoder('windows-1252').decode(buf);
    try{ return new TextDecoder('utf-8', { fatal: true }).decode(buf); }catch(e){ return new TextDecoder('windows-1252').decode(buf); }
  }
  function parseOFX(txt){
    const out = [], seen = {};
    const blocks = txt.split(/<STMTTRN>/i).slice(1);
    blocks.forEach((raw, i) => {
      const b = raw.split(/<\/STMTTRN>/i)[0];
      const g = k => { const m = new RegExp('<' + k + '>([^<\\r\\n]*)', 'i').exec(b); return m ? m[1].trim() : ''; };
      const dt = g('DTPOSTED'), v = parseFloat(g('TRNAMT').replace(',', '.'));
      if(!/^\d{8}/.test(dt) || !isFinite(v) || v === 0) return;
      const data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
      const descricao = (g('MEMO') || g('NAME') || 'Lançamento').replace(/\s+/g, ' ').slice(0, 140);
      let chave = g('FITID') ? 'ofx:' + g('FITID').slice(0, 100) : 'ofx:' + C.hash(data + '|' + v + '|' + descricao);
      seen[chave] = (seen[chave] || 0) + 1; if(seen[chave] > 1) chave += ':' + seen[chave];
      out.push({ data, valor: Math.round(v * 100) / 100, descricao, chave, origem: 'ofx' });
    });
    return out;
  }
  function splitCSV(line, d){
    const out = []; let cur = '', q = false;
    for(let i = 0; i < line.length; i++){
      const c = line[i];
      if(q){ if(c === '"'){ if(line[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; }
      else if(c === '"') q = true; else if(c === d){ out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map(s => s.trim());
  }
  function num(s){
    s = String(s || '').replace(/[R$\s]/g, '');
    if(!s) return NaN;
    /* v3.55: o sinal na frente também conta ("-2.000" era -2,00: o ponto de milhar só valia sem sinal) */
    const neg = /^\(.*\)$/.test(s) || /^[-\u2212]|-$/.test(s); s = s.replace(/[()]/g, '').replace(/^[-+\u2212]|-$/g, '');
    if(s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if(s.includes(',')) s = s.replace(',', '.');
    /* "1.500" e "2.000.000" no jeito brasileiro: o ponto é de milhar, não de centavo */
    else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const v = parseFloat(s); return neg ? -Math.abs(v) : v;
  }
  function dataCSV(s){
    s = String(s || '').trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s); if(m){ const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    return '';
  }
  function parseCSV(txt){
    const lines = txt.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if(!lines.length) return [];
    const d = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    let hi = -1, cols = null;
    for(let i = 0; i < Math.min(8, lines.length); i++){
      const h = splitCSV(lines[i], d).map(x => C.norm(x));
      const find = res => { for(const re of res){ const k = h.findIndex(x => re.test(x)); if(k >= 0) return k; } return -1; };
      const c = { data: find([/^data/, /date/, /^dt/]), valor: find([/^valor/, /amount/, /quantia/, /montante/, /valor/]), desc: find([/descri/, /historico/, /memo/, /lancamento/, /estabelecimento/, /title/, /identifica/]) };
      if(c.data >= 0 && c.valor >= 0){ hi = i; cols = c; break; }
    }
    if(!cols) return [];
    const out = [], seen = {};
    lines.slice(hi + 1).forEach(l => {
      const r = splitCSV(l, d), data = dataCSV(r[cols.data]), v = num(r[cols.valor]);
      if(!data || !isFinite(v) || v === 0) return;
      const descricao = String(cols.desc >= 0 ? (r[cols.desc] || '') : '').replace(/\s+/g, ' ').trim().slice(0, 140) || 'Lançamento';
      let chave = 'csv:' + C.hash(data + '|' + v + '|' + descricao);
      seen[chave] = (seen[chave] || 0) + 1; if(seen[chave] > 1) chave += ':' + seen[chave];
      out.push({ data, valor: Math.round(v * 100) / 100, descricao, chave, origem: 'csv' });
    });
    return out;
  }
  /* "automático": se a descrição cita uma marca do portfólio, o lançamento já entra com o cliente */
  function autoCliente(ls){
    const ms = G.marcas.map(m => [C.norm(m.marca), m.marca]).filter(([n]) => n.length >= 3);
    ls.forEach(l => { if(l.cliente) return; const d = C.norm(l.descricao); const hit = ms.find(([n]) => d.includes(n)); if(hit) l.cliente = hit[1]; });
    return ls;
  }

  /* ---------- desenho ---------- */
  function barras(){
    const meses = Array.from({ length: 6 }, (_, i) => addMes(G.mes, i - 5));
    const vals = meses.map(ym => { const ls = semTr(doMes(G.lanc, ym)).filter(l => l.valor > 0); return { ym, total: soma(ls), corre: soma(ls.filter(l => l.cliente)) }; });
    const max = Math.max(1, ...vals.map(v => v.total));
    return `<div class="g-bars" role="img" aria-label="Entradas dos últimos 6 meses">${vals.map(v => `<div class="gb${v.ym === G.mes ? ' on' : ''}" title="${mesNome(v.ym)}: entrou ${money(v.total)}, do corre ${money(v.corre)}"><div class="gb-col"><i class="t" style="height:${(v.total / max * 100).toFixed(1)}%"></i><i class="c" style="height:${(v.corre / max * 100).toFixed(1)}%"></i></div><span>${C.MESES[+v.ym.slice(5) - 1]}</span></div>`).join('')}</div>
      <div class="g-leg"><span><i class="t"></i>Entrou</span><span><i class="c"></i>Do corre (com cliente)</span></div>`;
  }
  function porMarca(ls){
    ls = semTr(ls);
    const map = new Map();
    ls.filter(l => l.valor > 0 && l.cliente).forEach(l => { const k = C.norm(l.cliente); const cur = map.get(k) || { nome: l.cliente, v: 0, n: 0 }; cur.v += Number(l.valor); cur.n++; map.set(k, cur); });
    const arr = [...map.values()].sort((a, b) => b.v - a.v), max = Math.max(1, ...arr.map(a => a.v));
    const sem = ls.filter(l => l.valor > 0 && !l.cliente);
    return (arr.length ? `<ul class="g-marcas">${arr.map(a => `<li><span class="nm">${esc(a.nome)}</span><span class="bar"><i style="width:${(a.v / max * 100).toFixed(1)}%"></i></span><b class="num">${money(a.v)}</b></li>`).join('')}</ul>` : '<p class="note">Marca um cliente nos lançamentos de entrada e aqui aparece quanto cada marca rendeu no mês.</p>')
      + (sem.length ? `<p class="note">${sem.length} ${sem.length === 1 ? 'entrada' : 'entradas'} sem cliente (${money(soma(sem))}). Marca o cliente embaixo pra contar no corre.</p>` : '');
  }
  /* pra onde foi o dinheiro do mês */
  function saidasHTML(ls){
    const sai = semTr(ls).filter(l => l.valor < 0), map = new Map();
    sai.forEach(l => { const k = catGuess(l) || 'sem'; map.set(k, (map.get(k) || 0) + Math.abs(Number(l.valor))); });
    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]), max = Math.max(1, ...arr.map(a => a[1]));
    if(!arr.length) return '<p class="note">Nenhuma saída no mês.</p>';
    const neg = arr.filter(([k]) => DO_NEGOCIO.includes(k)).reduce((t, [, v]) => t + v, 0), casa = (map.get('pessoal') || 0);
    return `<p class="note g-neg-casa">Do negócio <b class="num">− ${money(neg)}</b> · da casa <b class="num">− ${money(casa)}</b></p><ul class="g-marcas">${arr.map(([k, v]) => `<li><span class="nm">${esc(k === 'sem' ? 'Sem categoria' : CN[k] || k)}</span><span class="bar"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><b class="num">− ${money(v)}</b></li>`).join('')}</ul>
      ${map.has('sem') ? `<p class="fine">Toca na categoria de cada saída, lá embaixo, pra saber o que é gasto do negócio e o que é da casa.</p>` : ''}`;
  }
  /* o lucro de verdade: o que entrou do corre menos o que o corre gastou */
  function lucroHTML(ls){
    ls = semTr(ls);
    const ent = ls.filter(l => l.valor > 0 && (l.cliente || l.venda_id || l.categoria === 'venda'));
    const gasto = ls.filter(l => l.valor < 0 && DO_NEGOCIO.includes(catGuess(l)));
    const vs = G.vendas.filter(v => String(v.pago_em || '').slice(0, 7) === G.mes), vTot = vs.reduce((s, v) => s + Number(v.total), 0), vCus = vs.reduce((s, v) => s + Number(v.custo), 0);
    const e = soma(ent), g = Math.abs(soma(gasto));
    return `<div class="g-lucro"><div><span>Entrou do corre</span><b class="num">${money(e)}</b></div><div><span>Gasto do corre</span><b class="num">− ${money(g)}</b></div><div class="hl-box"><span>Lucro do corre</span><b class="num">${sinal(e - g)}</b></div></div>
      ${vs.length ? `<p class="note">${vs.length} ${vs.length === 1 ? 'venda paga' : 'vendas pagas'} pelas <a href="#/vendas">Vendas</a>: ${money(vTot)}, com ${money(vCus)} de custo dos itens. Sobrou ${money(vTot - vCus)} (${vTot ? Math.round((vTot - vCus) / vTot * 100) : 0}%).</p>` : '<p class="note">Venda lançada pelas <a href="#/vendas">Vendas</a> entra aqui já com o custo dos itens do catálogo.</p>'}`;
  }
  /* MEI: quanto faturou no ano, quanto ainda cabe e o DAS do mês */
  function meiHTML(){
    const e = G.est || {}, ano = C.hojeBR().slice(0, 4), lim = Number(e.mei_limite) || 81000, mesN = +C.hojeBR().slice(5, 7);
    const fat = soma(G.lanc.filter(l => !ehTr(l) && String(l.data).slice(0, 4) === ano && l.valor > 0 && (l.cliente || l.venda_id || l.categoria === 'venda')));
    /* projeção só com os meses que a Grana conhece (quem começou em outubro não zerou o ano todo) */
    const meses = G.lanc.filter(l => !ehTr(l) && String(l.data).slice(0, 4) === ano && l.valor > 0).map(l => +String(l.data).slice(5, 7));
    const desde = meses.length ? Math.min(...meses) : mesN, conhecidos = mesN - desde + 1;
    const pct = Math.min(100, fat / lim * 100), resta = lim - fat, mesesFalta = 12 - mesN + 1, proj = conhecidos >= 2 ? fat + (fat / conhecidos) * (12 - mesN) : 0;
    const das = DAS[e.mei_tipo] || DAS.servicos, ym = C.hojeBR().slice(0, 7);
    const pagouDas = G.lanc.some(l => String(l.data).slice(0, 7) === ym && l.valor < 0 && (l.categoria === 'imposto' || /\bDAS\b|SIMPLES|PGMEI/i.test(l.descricao || '')));
    return `<div class="g-mei"><div class="g-mei-top"><span class="mono">MEI · ${ano}</span><b class="num">${money(fat)}</b><small>de ${money(lim)}</small></div>
      <div class="mbar" role="img" aria-label="${Math.round(pct)}% do limite do MEI"><i style="width:${pct.toFixed(1)}%"></i></div>
      <p class="note">${resta > 0 ? `Ainda cabem <b class="num">${money(resta)}</b> no ano: dá pra faturar até uns <b class="num">${money(resta / mesesFalta)}</b> por mês sem passar do teto. ${proj ? `No ritmo desde ${C.MESES_L[desde - 1]}, o ano fecha em <b class="num">${money(proj)}</b>${proj > lim ? ' e <b>passa do teto</b>' : ''}.` : 'Com mais um mês de lançamentos, o Corre projeta onde o ano fecha.'}` : `<b>Passou do teto em ${money(-resta)}.</b>`}
      ${proj > lim || resta <= 0 ? ' Até 20% acima, paga a diferença e vira ME no ano seguinte; mais que isso, o desenquadramento volta pro começo do ano. Vale falar com um contador.' : ''}</p>
      <p class="note">DAS de ${C.MESES_L[mesN - 1]}: <b class="num">${money(das)}</b>, vence dia 20. ${pagouDas ? 'Já tem um lançamento de DAS esse mês.' : `<a href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao" target="_blank" rel="noopener">Gerar a guia (PGMEI)</a>`}</p>
      <p class="fine">Conta só entrada do corre (com cliente ou venda). Valores de 2026: limite de R$ 81 mil/ano (tem projeto no Congresso pra subir; se mudar, troca o limite em "Teu negócio") e DAS de R$ 81,05 + ICMS/ISS.</p></div>`;
  }
  function negocioHTML(){
    const e = G.est || {};
    return `<form class="form g-neg" id="g-neg">
      <div class="fld"><label for="g-pix">Tua chave Pix <small>(vai nas cobranças e nos orçamentos)</small></label><input class="inp" id="g-pix" maxlength="120" value="${esc(e.pix || '')}" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"></div>
      <div class="row2"><div class="fld"><label for="g-hm">Horas de trabalho por mês</label><input class="inp num" id="g-hm" inputmode="numeric" value="${esc(String(Number(e.horas_mes) || 160))}"><span class="hint">Com o teu estilo de vida, dá o valor da tua hora (o "quanto cobrar" do catálogo).</span></div>
        <label class="switch"><input type="checkbox" id="g-mei"${e.mei ? ' checked' : ''}><span class="sw"></span><span><b>Sou MEI</b><small>Mostra quanto do limite do ano já foi e o DAS do mês.</small></span></label></div>
      <div class="row2" id="g-mei-op"${e.mei ? '' : ' hidden'}><div class="fld"><label for="g-mt">Atividade</label><select class="inp" id="g-mt">${[['servicos', 'Serviço'], ['comercio', 'Comércio ou indústria'], ['ambos', 'Comércio e serviço']].map(([k, n]) => `<option value="${k}"${(e.mei_tipo || 'servicos') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="fld"><label for="g-ml">Limite do ano (R$)</label><input class="inp num" id="g-ml" inputmode="decimal" value="${esc((Number(e.mei_limite) || 81000).toLocaleString('pt-BR'))}"></div></div>
      <div class="acts"><button type="submit" class="btn sm pri">Salvar</button></div></form>`;
  }
  function contasHTML(){
    const cards = G.contas.map(c => { const ls = doMes(G.lanc, G.mes).filter(l => l.conta_id === c.id); return `<div class="g-conta" style="--c:${esc(c.cor || '#FFE800')}">
      <div class="gc-top"><span class="gc-dot"></span><b>${esc(c.apelido)}</b><small>${esc(c.banco || '')}</small><button type="button" class="lnk" data-act="g-conta-edit" data-id="${c.id}" aria-label="Editar conta ${esc(c.apelido)}">${ico('edit')}</button></div>
      <div class="gc-num"><span>Saldo do mês</span><b class="num">${sinal(soma(ls))}</b></div>
      <div class="acts"><button type="button" class="btn sm pri" data-act="g-importar" data-id="${c.id}">${ico('up')} Extrato</button><button type="button" class="btn sm" data-act="g-lancar" data-id="${c.id}">${ico('plus')} Lançar</button></div>
    </div>`; }).join('');
    const add = G.contas.length < 2 ? `<button type="button" class="g-conta add" data-act="g-conta-nova">${ico('plus')}<b>${G.contas.length ? 'Segunda conta' : 'Adicionar conta'}</b><small>Até duas: a PJ e a pessoal, por exemplo.</small></button>` : '';
    return cards + add;
  }
  function listaHTML(){
    let ls = doMes(G.lanc, G.mes); if(G.conta) ls = ls.filter(l => l.conta_id === G.conta);
    if(!ls.length) return '<p class="note">Nenhum lançamento neste mês. Puxa o extrato do banco ou lança na mão.</p>';
    const nome = id => (G.contas.find(c => c.id === id) || {}).apelido || '';
    return `<ul class="g-lanc">${ls.map(l => `<li>
      <span class="dt num">${C.ddmm(l.data)}</span>
      <span class="ds"><b>${esc(l.descricao)}</b><small>${esc(nome(l.conta_id))}${l.origem === 'venda' ? ' · venda' : l.origem !== 'manual' ? ' · extrato' : ''}</small></span>
      ${ehTr(l) ? `<button type="button" class="cli g-tr" data-act="g-tr-tira" data-id="${l.id}" title="Não é transferência? Toca pra voltar a contar">${ico('troca')}<span>Entre contas</span></button>` : l.valor > 0 ? `<input class="inp cli" list="g-clientes" value="${esc(l.cliente || '')}" placeholder="Cliente" maxlength="60" data-chg="g-cli" data-id="${l.id}" aria-label="Cliente de ${esc(l.descricao)}">` : `<select class="inp cli g-cat${l.categoria ? '' : ' palpite'}" data-chg="g-cat" data-id="${l.id}" aria-label="Categoria de ${esc(l.descricao)}"><option value="">Categoria</option>${CAT_SAI.map(([k, n]) => `<option value="${k}"${catGuess(l) === k ? ' selected' : ''}>${n}</option>`).join('')}<option value="${TRANSF}">${TRANSF_N}</option></select>`}
      <button type="button" class="vl num vl-edit" data-act="g-edit" data-id="${l.id}" title="Editar" aria-label="Editar ${esc(l.descricao)}: ${esc(sinal(Number(l.valor)))}">${sinal(Number(l.valor))}${ico('edit')}</button>
      <button type="button" class="lnk del${G.armed === l.id ? ' armed' : ''}" data-act="g-del" data-id="${l.id}" aria-label="${G.armed === l.id ? 'Confirmar: apagar' : 'Apagar'}">${G.armed === l.id ? 'Apagar?' : ico('trash')}</button>
    </li>`).join('')}</ul>`;
  }
  const nomeConta = id => (G.contas.find(c => c.id === id) || {}).apelido || 'conta';
  function clientesDatalist(){
    const set = new Map(); G.marcas.forEach(m => set.set(C.norm(m.marca), m.marca)); G.lanc.forEach(l => { if(l.cliente) set.set(C.norm(l.cliente), l.cliente); });
    return `<datalist id="g-clientes">${[...set.values()].map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
  }
  /* ---------- Robô na Binance (Corre+): a oferta e a lista de espera. O robô é de um parceiro e entra depois,
     ligado por fora; aqui ninguém opera nada e nenhuma chave de corretora fica no Corre. ---------- */
  function roboHTML(){
    const f = (C.st.me && C.st.me.ferramentas && typeof C.st.me.ferramentas === 'object') ? C.st.me.ferramentas : {}, na = f.robo === 'lista';
    const link = C.CFG && typeof C.CFG.ROBO_URL === 'string' && /^https:\/\//.test(C.CFG.ROBO_URL) ? C.CFG.ROBO_URL : '';
    return `<section class="card g-robo" id="g-robo"><div class="g-robo-h"><span class="tag plus">Corre+</span><h2 class="ch">Robô na Binance</h2><span class="tag">em breve</span></div>
      <p>Um robô que opera cripto sozinho na tua conta da Binance, 24 horas, com limite de perda que você define. Acesso pago, dentro do Corre+. Quem levantar a mão agora entra primeiro, quando abrir.</p>
      <ul class="g-robo-l"><li>A conta e o dinheiro ficam na tua Binance: o Corre nunca guarda chave de corretora.</li><li>Resultado não é garantido: cripto sobe e desce, e o robô pode perder.</li><li>Você liga e desliga quando quiser.</li></ul>
      <div class="acts">${na ? '<span class="tag pub">Tu tá na lista. A gente te chama quando abrir.</span>' : `<button type="button" class="btn pri" data-act="g-robo-quero">Quero na lista</button>`}${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${ico('ext')} Abrir o robô</a>` : ''}${C.CFG && C.CFG.CONTATO_PLANO ? `<a class="btn ghost" href="${esc(C.CFG.CONTATO_PLANO)}" target="_blank" rel="noopener">Falar com o Corre</a>` : ''}</div></section>`;
  }
  function render(){
    /* v3.19: a grana mora na página Corre, embaixo das vendas (#corre-grana) */
    const box = C.$('corre-grana'); if(!box) return;
    const ls = doMes(G.lanc, G.mes), lc = semTr(ls), ent = lc.filter(l => l.valor > 0), sai = lc.filter(l => l.valor < 0);
    const sug = sugestoesTransf(), trMes = ls.filter(ehTr);
    const me = C.st.me, mostra = me.grana_mostra || 'nada';
    box.innerHTML = `<div class="g-pg">
      <div class="sec-row corre-tit"><h2 class="sec-t"><span class="hl">Grana</span></h2><span class="note">contas, extrato e quanto sobrou. O perfil mostra só o que você liberar.</span></div>
      <section class="card g-top">
        <div class="g-mes"><button type="button" class="cbtn" data-act="g-mes" data-k="-1" aria-label="Mês anterior"${G.mes <= addMes(C.hojeBR().slice(0, 7), -11) ? ' disabled' : ''}>${ico('prev')}</button><h2>${mesNome(G.mes)}</h2><button type="button" class="cbtn" data-act="g-mes" data-k="1" aria-label="Próximo mês"${G.mes >= C.hojeBR().slice(0, 7) ? ' disabled' : ''}>${ico('next')}</button></div>
        <div class="g-nums">
          <div><span>Entrou</span><b class="num">${money(soma(ent))}</b></div>
          <div><span>Saiu</span><b class="num">${sinal(soma(sai))}</b></div>
          <div><span>Sobrou</span><b class="num">${sinal(soma(lc))}</b></div>
          <div class="hl-box"><span>Do corre</span><b class="num">${money(soma(ent.filter(l => l.cliente)))}</b></div>
        </div>
        ${barras()}
        ${trMes.length ? `<p class="fine g-tr-nota">${trMes.length} ${trMes.length === 1 ? 'transferência' : 'transferências'} entre tuas contas no mês (${money(soma(trMes.filter(l => l.valor > 0)))}) não ${trMes.length === 1 ? 'conta' : 'contam'} como entrada nem saída.</p>` : ''}
      </section>
      ${sug.length ? `<section class="card g-tr-sug"><h2 class="ch">${ico('troca')} Isso é dinheiro teu mudando de conta?</h2>
        <p>Achei ${sug.length === 1 ? 'uma transferência' : sug.length + ' transferências'} entre tuas contas: o mesmo valor saindo de uma e entrando na outra. Hoje ${sug.length === 1 ? 'ela tá' : 'elas tão'} contando como entrada (e saída).</p>
        <ul class="g-prev">${sug.slice(0, 4).map(([a, b]) => `<li><span class="num">${C.ddmm(a.data)}</span><span>${esc(nomeConta(a.conta_id))} → ${esc(nomeConta(b.conta_id))}</span><b class="num">${money(Math.abs(Number(a.valor)))}</b></li>`).join('')}${sug.length > 4 ? `<li class="more">e mais ${sug.length - 4}</li>` : ''}</ul>
        <div class="acts"><button type="button" class="btn sm pri" data-act="g-tr-sim">Marcar como ${TRANSF_N.toLowerCase()}</button><button type="button" class="btn sm ghost" data-act="g-tr-nao">Não são</button></div></section>` : ''}
      <div class="two">
        <section class="card"><h2 class="ch">Quanto cada cliente rendeu</h2>${porMarca(ls)}</section>
        <section class="card"><h2 class="ch">No teu perfil</h2>
          <div class="vis vis3" role="radiogroup" aria-label="O que da Grana aparece no perfil">
            ${[['nada', 'Mocado', 'Ninguém vê nada da Grana.'], ['faixa', 'Faixa', 'Mostra a faixa do mês (ex.: R$ 5 a 10 mil) e quantas marcas você toca.'], ['valor', 'Valor', 'Mostra o valor do mês, do corre, e quantas marcas você toca.'], ['bolinhas', 'Bolinhas', 'Mostra o valor do mês com bolinha no lugar de cada número (R$ •••.•••,••). Dá o tamanho do corre sem entregar a conta.']].map(([v, t, d]) => `<label class="opt"><input type="radio" name="g-mostra" value="${v}" data-chg="g-mostra"${mostra === v ? ' checked' : ''}><span class="dot"></span><span><b>${t}</b><small>${d}</small></span></label>`).join('')}
          </div>
          <p class="fine">O valor conta só entrada com cliente marcado (toca no valor do lançamento pra editar). As marcas são as do teu <a href="#/marcas">Portfólio</a>. Extrato, contas e lançamentos nunca aparecem pra ninguém.</p>
        </section>
      </div>
      <div class="two">
        <section class="card"><h2 class="ch">Lucro do corre</h2>${lucroHTML(ls)}</section>
        <section class="card"><h2 class="ch">Pra onde foi</h2>${saidasHTML(ls)}</section>
      </div>
      <div class="two">
        ${(G.est || {}).mei ? `<section class="card"><h2 class="ch">MEI</h2>${meiHTML()}</section>` : ''}
        <section class="card"><h2 class="ch">Teu negócio</h2>${negocioHTML()}</section>
      </div>
      ${roboHTML()}
      <h2 class="sec-t"><span class="hl">Contas</span></h2>
      <div class="g-contas">${contasHTML()}</div>
      <section class="card">
        <div class="ch-row"><h2 class="ch">Lançamentos de ${mesNome(G.mes)}</h2>${G.contas.length > 1 ? `<select class="inp sm" data-chg="g-filtro" aria-label="Filtrar por conta"><option value="">Todas as contas</option>${G.contas.map(c => `<option value="${c.id}"${G.conta === c.id ? ' selected' : ''}>${esc(c.apelido)}</option>`).join('')}</select>` : ''}</div>
        ${listaHTML()}${clientesDatalist()}
      </section>
      <section class="card how"><h2 class="ch">Como puxar o extrato</h2><p>No app ou no site do banco: <b>Extrato</b> → <b>Exportar</b> → escolhe <b>OFX</b> (ou CSV/Excel salvo como CSV) → manda pro teu e-mail ou salva no celular → aqui em <b>Extrato</b>. Lançamento repetido não entra duas vezes, então dá pra mandar o mês inteiro sempre que quiser.</p></section>
    </div>`;
    if(C.correMes && C.$('g-corre')){ const ym = C.hojeBR().slice(0, 7); C.correMes(C.$('g-corre'), { entrou: soma(semTr(doMes(G.lanc, ym)).filter(l => l.valor > 0)) }); }
    const nf = C.$('g-neg');
    if(nf){
      nf.addEventListener('change', e => { if(e.target.id === 'g-mei') C.$('g-mei-op').hidden = !e.target.checked; });
      nf.addEventListener('submit', async e => {
        e.preventDefault();
        const hm = Math.round(Number(String(C.$('g-hm').value).replace(',', '.')) || 160), ml = C.catalogo ? C.catalogo.parseReais(C.$('g-ml').value) : Number(C.$('g-ml').value);
        if(hm < 1 || hm > 744){ C.toast('Horas por mês: de 1 a 744.'); return; }
        const row = { dono: C.uid(), pix: C.$('g-pix').value.trim().slice(0, 120), horas_mes: hm, mei: C.$('g-mei').checked, mei_tipo: C.$('g-mt').value, mei_limite: ml > 0 ? ml : 81000 };
        try{ await C.api.upsert('corre_estilo', [row], 'dono'); if(C.estiloEsquece) C.estiloEsquece(); await carregar(); render(); C.toast('Negócio salvo.'); }catch(err){ C.toast(C.errMsg(err)); }
      });
    }
  }

  C.granaPainel = { async montar(){ await carregar(); render(); } };

  /* ---------- folhas ---------- */
  function contaForm(c){
    c = c || { apelido: '', banco: '', cor: CORES[G.contas.length % CORES.length] };
    C.sheet(`<form class="form" id="g-cf"><div class="sheet-head"><h2>${c.id ? 'Editar conta' : 'Nova conta'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="g-ap">Apelido</label><input class="inp" id="g-ap" maxlength="30" required value="${esc(c.apelido)}" placeholder="PJ, Pessoal, Corre…" autofocus></div>
      <div class="fld"><label for="g-bc">Banco</label><select class="inp" id="g-bc">${BANCOS.map(b => `<option${c.banco === b ? ' selected' : ''}>${b}</option>`).join('')}</select></div>
      <fieldset class="fld"><legend>Cor</legend><div class="cores">${CORES.map(k => `<label class="cor"><input type="radio" name="g-cor" value="${k}"${(c.cor || CORES[0]) === k ? ' checked' : ''}><i style="background:${k}"></i></label>`).join('')}</div></fieldset>
      <div class="acts"><button type="submit" class="btn pri">${c.id ? 'Salvar' : 'Criar conta'}</button>${c.id ? `<button type="button" class="btn ghost" data-act="g-conta-del" data-id="${c.id}">${ico('trash')} Apagar conta</button>` : ''}</div>
      <p class="fine" id="g-cdel" hidden></p>
    </form>`);
    C.umaVez(C.$('g-cf'), async e => {
      const row = { apelido: C.$('g-ap').value.trim(), banco: C.$('g-bc').value, cor: (document.querySelector('input[name="g-cor"]:checked') || {}).value || '' };
      if(!row.apelido){ C.toast('Dá um apelido pra conta.'); return; }
      try{ if(c.id) await C.api.upd('corre_contas', { id: c.id }, row); else await C.api.ins('corre_contas', row); C.closeSheet(); await carregar(); render(); C.toast(c.id ? 'Conta salva.' : 'Conta criada.'); }
      catch(err){ C.toast(C.errMsg(err)); }
    });
  }
  /* valor pro campo: 102200.5 -> "102.200,50" */
  const paraCampo = v => Math.abs(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function lancarForm(contaId, l){
    const hoje = C.hojeBR(), dia = l ? String(l.data).slice(0, 10) : G.mes === hoje.slice(0, 7) ? hoje : G.mes + '-01';
    const sai = l && Number(l.valor) < 0;
    if(l) contaId = l.conta_id;
    C.sheet(`<form class="form" id="g-lf"><div class="sheet-head"><h2>${l ? 'Editar lançamento' : 'Lançar'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="seg2" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="g-tp" value="1"${sai ? '' : ' checked'}><span>Entrou</span></label><label><input type="radio" name="g-tp" value="-1"${sai ? ' checked' : ''}><span>Saiu</span></label></div>
      <div class="row2"><div class="fld"><label for="g-vl">Valor (R$)</label><input class="inp num" id="g-vl" inputmode="decimal" placeholder="0,00" required autofocus value="${l ? esc(paraCampo(l.valor)) : ''}"></div><div class="fld"><label for="g-dt">Data</label><input class="inp" id="g-dt" type="date" value="${dia}" required></div></div>
      <div class="fld"><label for="g-ds">Descrição</label><input class="inp" id="g-ds" maxlength="140" placeholder="Pacote de outubro, diária de filmagem…" value="${l ? esc(l.descricao || '') : ''}"></div>
      <div class="fld" id="g-clf"${sai ? ' hidden' : ''}><label for="g-cl">Cliente</label><input class="inp" id="g-cl" list="g-clientes" maxlength="60" placeholder="Quem pagou (deixa em branco se não é do corre)" value="${l ? esc(l.cliente || '') : ''}"></div>
      <div class="fld" id="g-caf"${sai ? '' : ' hidden'}><label for="g-ca">Categoria</label><select class="inp" id="g-ca"><option value="">Sem categoria</option>${CAT_SAI.map(([k, n]) => `<option value="${k}"${l && catGuess(l) === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <label class="switch"><input type="checkbox" id="g-tr"${l && ehTr(l) ? ' checked' : ''}><span class="sw"></span><span><b>${TRANSF_N}</b><small>Dinheiro teu mudando de conta: não conta como entrada nem saída.</small></span></label>
      ${G.contas.length > 1 ? `<div class="fld"><label for="g-ct">Conta</label><select class="inp" id="g-ct">${G.contas.map(c => `<option value="${c.id}"${c.id === contaId ? ' selected' : ''}>${esc(c.apelido)}</option>`).join('')}</select></div>` : ''}
      ${l && l.origem && l.origem !== 'manual' ? '<p class="fine">Veio do extrato. Se você mandar o mesmo extrato de novo, ele não volta duplicado nem desfaz a tua edição.</p>' : ''}
      <div class="acts"><button type="submit" class="btn pri">${l ? 'Salvar' : 'Lançar'}</button>${l ? '<button type="button" class="btn" data-close>Cancelar</button>' : ''}</div>${clientesDatalist()}
    </form>`);
    const vl = C.$('g-vl'); if(l && vl){ vl.focus(); vl.select(); }
    C.$('g-lf').addEventListener('change', () => { const s1 = (document.querySelector('input[name="g-tp"]:checked') || {}).value === '-1'; C.$('g-clf').hidden = s1; C.$('g-caf').hidden = !s1; });
    C.umaVez(C.$('g-lf'), async e => {
      const tp = Number((document.querySelector('input[name="g-tp"]:checked') || {}).value || 1), v = Math.abs(num(C.$('g-vl').value));
      if(!isFinite(v) || !v){ C.toast('Coloca o valor.'); C.$('g-vl').focus(); return; }
      const tr = C.$('g-tr') && C.$('g-tr').checked;
      const row = { conta_id: C.$('g-ct') ? C.$('g-ct').value : contaId, data: C.$('g-dt').value, valor: Math.round(v * tp * 100) / 100, descricao: C.$('g-ds').value.trim() || (tr ? TRANSF_N : tp > 0 ? 'Entrada' : 'Saída'), cliente: tp > 0 && !tr ? C.$('g-cl').value.trim() : '', categoria: tr ? TRANSF : tp > 0 ? (C.$('g-cl').value.trim() ? 'venda' : (l && !ehTr(l) && l.categoria) || '') : (C.$('g-ca').value === TRANSF ? '' : C.$('g-ca').value) };
      try{
        if(l) await C.api.upd('corre_lancamentos', { id: l.id }, row);
        else await C.api.ins('corre_lancamentos', Object.assign(row, { origem: 'manual' }));
        C.closeSheet(); G.mes = noAlcance(row.data.slice(0, 7)); await carregar(); render(); C.toast(l ? 'Lançamento salvo.' : 'Lançado.');
      }catch(err){ C.toast(C.errMsg(err)); }
    });
  }
  async function importar(contaId){
    const file = await C.pickFile('.ofx,.OFX,.csv,.CSV,.txt,application/x-ofx,text/csv');
    if(!file) return;
    if(file.size > 5e6){ C.toast('Arquivo grande demais (até 5 MB).'); return; }
    let ls = [];
    try{ const txt = await lerArquivo(file); ls = /<OFX>|<STMTTRN>/i.test(txt) ? parseOFX(txt) : parseCSV(txt); }catch(e){ ls = []; }
    if(!ls.length){ C.toast('Não achei lançamentos nesse arquivo. Tenta exportar em OFX.', 5000); return; }
    autoCliente(ls);
    ls.forEach(l => { if(!l.categoria){ const k = catGuess(l); if(k) l.categoria = k; } });
    const dsTodos = ls.map(l => l.data).sort();
    /* o "Recebi" das Vendas já lançou esse dinheiro: o extrato só carimba a chave nele, não duplica */
    const casar = [];
    /* procura em TODAS as contas (o "Recebi" pode ter caído na "Conta do corre" automática) e pula linha do extrato que já foi importada */
    const jaTem = new Set(G.lanc.filter(x => x.conta_id === contaId && x.chave).map(x => x.chave));
    ls = ls.filter(l => {
      if(!(l.valor > 0) || jaTem.has(l.chave)) return true;
      const v = G.lanc.find(x => x.origem === 'venda' && !x.chave && Math.abs(Number(x.valor) - l.valor) < 0.01 && Math.abs(Date.parse(x.data) - Date.parse(l.data)) <= 3 * 864e5 && !casar.some(c => c.id === x.id));
      if(v){ casar.push({ id: v.id, chave: l.chave }); return false; }
      return true;
    });
    /* transferência pra outra conta tua que já tá aqui: os dois lados viram "entre minhas contas" */
    const novos = ls.filter(l => !jaTem.has(l.chave)).map(l => Object.assign(l, { conta_id: contaId }));
    const outros = G.lanc.filter(x => x.conta_id !== contaId);
    const prTr = paresTransf(outros.concat(novos)).filter(([a, b]) => novos.includes(a) || novos.includes(b));
    const trVelhos = [];
    prTr.forEach(([a, b]) => [a, b].forEach(x => { if(novos.includes(x)) x.categoria = TRANSF; else trVelhos.push(x.id); }));
    const ent = semTr(ls).filter(l => l.valor > 0), sai = semTr(ls).filter(l => l.valor < 0), ds = (ls.length ? ls : [{ data: C.hojeBR() }]).map(l => l.data).sort();
    const conta = G.contas.find(c => c.id === contaId) || {};
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Extrato · ${esc(conta.apelido || '')}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p><b>${ls.length}</b> lançamentos de ${C.ddmm(ds[0])} a ${C.ddmm(ds[ds.length - 1])}: entrou <b class="num">${money(soma(ent))}</b>, saiu <b class="num">${sinal(soma(sai))}</b>.</p>
      ${casar.length ? `<p class="note">${casar.length} ${casar.length === 1 ? 'entrada já tava' : 'entradas já tavam'} na Grana pelo "Recebi" das Vendas: não vão duplicar.</p>` : ''}
      ${prTr.length ? `<p class="note">${prTr.length} ${prTr.length === 1 ? 'transferência' : 'transferências'} com a tua outra conta: ${prTr.length === 1 ? 'entra' : 'entram'} como "${TRANSF_N}" e não ${prTr.length === 1 ? 'conta' : 'contam'} como entrada nem saída.</p>` : ''}
      ${ent.some(l => l.cliente) ? `<p class="note">${ent.filter(l => l.cliente).length} entradas já vieram com cliente, pelo nome das marcas do teu portfólio.</p>` : ''}
      <ul class="g-prev">${ls.slice(0, 6).map(l => `<li><span class="num">${C.ddmm(l.data)}</span><span>${esc(l.descricao)}${l.cliente ? ` · <b>${esc(l.cliente)}</b>` : ''}</span><b class="num">${sinal(l.valor)}</b></li>`).join('')}${ls.length > 6 ? `<li class="more">e mais ${ls.length - 6}</li>` : ''}</ul>
      <div class="acts"><button type="button" class="btn pri" id="g-imp-ok">Importar</button><button type="button" class="btn" data-close>Cancelar</button></div>
      <p class="fine">O que já tinha entrado antes não duplica.</p></div>`);
    C.$('g-imp-ok').addEventListener('click', async ev => {
      ev.target.disabled = true; ev.target.textContent = 'Importando…';
      try{
        let nNovos = 0;
        for(const c of casar){ try{ await C.api.upd('corre_lancamentos', { id: c.id }, { chave: c.chave, conta_id: contaId }); }catch(e){} }
        for(const id of trVelhos){ try{ await C.api.upd('corre_lancamentos', { id }, { categoria: TRANSF }); }catch(e){} }
        for(let i = 0; i < ls.length; i += 400){ const r = await C.api.upsert('corre_lancamentos', ls.slice(i, i + 400).map(l => Object.assign({ conta_id: contaId, cliente: l.cliente || '' }, l)), 'conta_id,chave', true); nNovos += r.length; }
        C.closeSheet(); G.mes = noAlcance(ds[ds.length - 1].slice(0, 7)); await carregar(); render();
        C.toast(nNovos ? `${nNovos} lançamentos novos.` : 'Tudo isso já estava aqui.');
      }catch(err){ C.toast(C.errMsg(err)); ev.target.disabled = false; ev.target.textContent = 'Importar'; }
    });
  }

  Object.assign(C.acts, {
    'g-robo-quero': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { robo: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do robô. A gente te chama quando abrir.', 3600); const b = C.$('g-robo'); if(b) b.outerHTML = roboHTML(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    /* v3.55: o Corre carrega os últimos 12 meses; antes disso a tela mostrava zero (e "nenhum lançamento") com dado no banco */
    'g-mes': el => { G.mes = noAlcance(addMes(G.mes, Number(el.dataset.k))); render(); },
    'g-conta-nova': () => contaForm(null),
    'g-conta-edit': el => contaForm(G.contas.find(c => c.id === el.dataset.id)),
    'g-conta-del': async el => {
      const p = C.$('g-cdel');
      if(p.hidden){ p.hidden = false; p.textContent = 'Apagar a conta apaga todos os lançamentos dela. Toca de novo pra confirmar.'; el.classList.add('armed'); return; }
      try{ await C.api.del('corre_contas', { id: el.dataset.id }); C.closeSheet(); await carregar(); render(); C.toast('Conta apagada.'); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'g-lancar': el => lancarForm(el.dataset.id),
    'g-edit': el => {
      if(C.oculto){ C.toast('Valores escondidos. Toca no olho lá em cima pra ver e editar.'); return; }
      const l = G.lanc.find(x => x.id === el.dataset.id); if(l) lancarForm(l.conta_id, l);
    },
    'g-importar': el => importar(el.dataset.id),
    'g-del': async el => {
      const id = el.dataset.id;
      if(G.armed !== id){ G.armed = id; render(); return; }
      G.armed = '';
      try{ await C.api.del('corre_lancamentos', { id }); G.lanc = G.lanc.filter(l => l.id !== id); render(); }catch(e){ C.toast(C.errMsg(e)); render(); }
    },
    'g-cli': async el => {
      const l = G.lanc.find(x => x.id === el.dataset.id); if(!l) return;
      const v = el.value.trim().slice(0, 60); if(v === (l.cliente || '')) return;
      try{ await C.api.upd('corre_lancamentos', { id: l.id }, { cliente: v }); l.cliente = v; render(); C.toast(v ? `Marcado: ${v}.` : 'Cliente tirado.'); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'g-filtro': el => { G.conta = el.value; render(); },
    'g-tr-tira': async el => {
      const l = G.lanc.find(x => x.id === el.dataset.id); if(!l) return;
      try{ await C.api.upd('corre_lancamentos', { id: l.id }, { categoria: '' }); l.categoria = ''; const n = dispensadas(); n.add(l.id); try{ localStorage.setItem(DISPENSA_K, JSON.stringify([...n].slice(-500))); }catch(e){} render(); C.toast('Voltou a contar como ' + (l.valor > 0 ? 'entrada.' : 'saída.')); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'g-tr-sim': async el => {
      el.disabled = true; const pr = sugestoesTransf(); let n = 0;
      try{
        for(const [a, b] of pr) for(const l of [a, b]){ await C.api.upd('corre_lancamentos', { id: l.id }, { categoria: TRANSF }); l.categoria = TRANSF; n++; }
        render(); C.toast(`${n} lançamentos marcados como ${TRANSF_N.toLowerCase()}.`);
      }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); }
    },
    'g-tr-nao': () => { const n = dispensadas(); sugestoesTransf().forEach(([a, b]) => { n.add(a.id); n.add(b.id); }); try{ localStorage.setItem(DISPENSA_K, JSON.stringify([...n].slice(-500))); }catch(e){} render(); },
    'g-cat': async el => {
      const l = G.lanc.find(x => x.id === el.dataset.id); if(!l) return;
      try{ await C.api.upd('corre_lancamentos', { id: l.id }, { categoria: el.value }); l.categoria = el.value; render(); C.toast(el.value === TRANSF ? 'Entre minhas contas: não conta como saída.' : el.value ? `${CN[el.value]}.` : 'Categoria tirada.'); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'g-mostra': async el => { try{ await C.saveMe({ grana_mostra: el.value }); C.toast({ nada: 'Grana mocada.', faixa: 'Teu perfil mostra a faixa do mês.', valor: 'Teu perfil mostra a grana do mês.', bolinhas: 'Teu perfil mostra a grana do mês em bolinhas.' }[el.value] || 'Pronto.'); }catch(e){ C.toast(C.errMsg(e)); render(); } }
  });

  C.home.push({ k: 'grana', o: 3, async html(){
    try{ await carregar(); }catch(e){ return ''; }
    const ym = C.hojeBR().slice(0, 7), ls = semTr(doMes(G.lanc, ym)).filter(l => l.valor > 0);
    return `<a class="hcard grana-mini" href="#/grana">
      <div class="hc-top"><span class="hc-name">Grana</span><span class="mono">${mesNome(ym)} · só você vê</span></div>
      ${G.contas.length ? `<div class="g-mini"><div><span>Entrou</span><b class="num">${money(soma(ls))}</b></div><div><span>Do corre</span><b class="num">${money(soma(ls.filter(l => l.cliente)))}</b></div></div>` : '<p class="note">Liga tuas duas contas e vê quanto o corre tá rendendo.</p>'}
      <span class="hc-go">${G.contas.length ? 'Abrir a Grana' : 'Adicionar conta'} ${ico('next')}</span>
    </a>`;
  } });
  C.granaParse = { parseOFX, parseCSV };
})();

/* ---------------- v3.60 · os planos, pagos pelo Asaas ----------------
   O Thales (16/10/2026): "1 rede social de graça, 2 redes 59,90, 3 redes 69,90, 4 ou mais 79,90; Studio Houzi 29,90 por
   mês (30 dias de graça); Hórus 9,90 por mês (30 dias de graça); quero usar Asaas". O preço que vale é o da função
   "pagamento" (a pessoa nunca manda valor); aqui é só a vitrine. Quem diz quem tem acesso é o banco (C.acesso). */
(function(){
  'use strict';
  const C = window.Corre, ico = C.ico, esc = C.esc;
  const NOME = { studio: 'Studio Cria', houzi: 'Studio Houzi', horus: 'Hórus' };
  const PRECO = { houzi: 29.90, horus: 9.90 }, STUDIO = { 2: 59.90, 3: 69.90, 4: 79.90 };
  const ICO = { studio: 'magia', houzi: 'houzi', horus: 'eye' };
  const SOBRE = {
    studio: 'Programa e posta no Instagram de cada marca que você toca. Uma rede social é de graça.',
    houzi: 'Marca com conceito: naming, logo, cores, voz e o brandbook vivo. 30 dias de graça.',
    horus: 'O radar de clientes: caça, aquece e lembra de quem comprar de você. 30 dias de graça.'
  };
  /* dinheiro aqui é preço de vitrine: não esconde com o olho da grana (o C.money esconde) */
  const reais = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  const nivelNome = n => n >= 4 ? '4 ou mais redes' : n === 1 ? '1 rede' : n + ' redes';
  /* o nível pelo valor (a mesma conta da função: o que vale é o preço) */
  const nivelDoValor = (v, antes) => { v = Number(v) || 0; return v >= 79.89 ? 4 : v >= 69.89 ? 3 : v >= 59.89 ? 2 : antes; };
  const precoDe = (prod, nivel) => prod === 'studio' ? STUDIO[Math.max(2, Math.min(4, nivel || 2))] : PRECO[prod];
  /* datas: o teste é um instante (timestamptz), o pago é um dia; tudo na hora de Brasília */
  const diaDe = iso => iso ? C.hojeBR(new Date(iso)) : '';
  const ddmm = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
  const mais = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const faltam = iso => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
  const plano = prod => (C.acesso && C.acesso.planos && C.acesso.planos[prod]) || null;
  const noTeste = p => !!(p && p.teste_ate && Date.parse(p.teste_ate) > Date.now());
  /* v3.72: a versão dos Termos de uso que a pessoa aceita ao assinar (a mesma do data-versao do termos.html; a função
     anota). Mudou algo importante nos termos, sobe as duas juntas */
  const TERMOS_V = '2026-10-20';
  /* v4.13: as skins de Halloween em real (o Ateliê, no verso.js) aceitam a mesma versão */
  C.TERMOS_V = TERMOS_V;
  /* v3.72: o que dá pra desistir com devolução (o direito de arrependimento, 7 dias do primeiro pagamento). Quem diz é a
     função, ao abrir os Planos; aqui fica só o que ela respondeu, por produto */
  const DV = {};
  const dias = d => Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse(C.hojeBR() + 'T12:00:00Z')) / 864e5);

  /* o estado de um plano em uma frase, e os botões que cabem */
  function estado(prod){
    const A = C.acesso, p = plano(prod);
    /* v3.80: dono do Corre (corre_donos) tem tudo liberado, como o fundador */
    if(A.fundador || A.dono) return { txt: A.fundador ? 'Fundador: liberado, sem pagar.' : 'Dono: liberado, sem pagar.', bts: [] };
    if(!p || (prod === 'studio' && !p.assinado && p.status !== 'cancelada')){
      if(prod === 'studio') return { txt: `Grátis: 1 rede social. Você usa ${A.usadas || 0}.`, bts: ['assinar'] };
      return { txt: 'Os 30 dias grátis começam no teu primeiro uso.', bts: ['assinar'] };
    }
    const tz = diaDe(p.teste_ate), fimPago = p.pago_ate || '', st = p.status;
    if(st === 'teste'){
      if(noTeste(p)) return p.assinado
        ? { txt: `Assinado. Grátis até ${ddmm(tz)}; a primeira cobrança vence nesse dia.`, bts: ['pagar', 'cancelar'] }
        : { txt: `Teste grátis: ${faltam(p.teste_ate) === 1 ? 'falta 1 dia' : `faltam ${faltam(p.teste_ate)} dias`} (até ${ddmm(tz)}).`, bts: ['assinar'] };
      return p.acesso ? { txt: 'Ativo.', bts: p.assinado ? ['cancelar'] : [] } : { txt: `O teste grátis acabou em ${ddmm(tz)}.`, bts: p.assinado ? ['pagar', 'cancelar'] : ['assinar'], fora: true };
    }
    if(st === 'pendente') return p.acesso ? { txt: `Ativo até ${ddmm(fimPago)}. Tem uma fatura esperando.`, bts: ['pagar', 'cancelar'] } : { txt: 'Esperando o pagamento da primeira fatura.', bts: ['pagar', 'cancelar'], fora: true };
    /* v3.61: o nível do Studio é o pago; pediu outro, ele vale quando a fatura com o valor novo for paga */
    const pede = prod === 'studio' && p.assinado ? nivelDoValor(p.valor, p.nivel) : 0, troca = pede && pede !== p.nivel ? ` Na próxima fatura paga: ${nivelNome(pede)}.` : '';
    if(st === 'ativa') return { txt: `Ativo${prod === 'studio' ? `, ${nivelNome(p.nivel)}` : ''}. Pago até ${ddmm(fimPago)}; renova sozinho.${troca}`, bts: (p.link || troca ? ['pagar'] : []).concat(prod === 'studio' ? ['trocar', 'cancelar'] : ['cancelar']) };
    if(st === 'atrasada') return p.acesso ? { txt: `A fatura venceu. Paga até ${ddmm(mais(fimPago, 3))} pra não parar.`, bts: ['pagar', 'cancelar'] } : { txt: 'Parado: a fatura venceu.', bts: ['pagar', 'cancelar'], fora: true };
    /* cancelada: o que foi pago (ou o teste) vale até o fim */
    const vale = [fimPago ? mais(fimPago, 3) : '', tz].filter(Boolean).sort().pop();
    return p.acesso ? { txt: `Cancelado. Vale até ${ddmm(vale)}.`, bts: ['assinar'] } : { txt: 'Cancelado.', bts: ['assinar'], fora: true };
  }
  /* v4.31: no app da Google Play não tem botão de comprar (assinar, trocar de plano, pagar a fatura): ver C.naLoja */
  const COMPRA = { assinar: 1, trocar: 1, pagar: 1 };
  const btLoja = b => !(C.naLoja && C.naLoja() && COMPRA[b]);
  const BOTAO = {
    assinar: prod => `<button type="button" class="btn sm pri" data-act="pl-assinar" data-p="${prod}">${ico('cartao')} Assinar</button>`,
    trocar: prod => `<button type="button" class="btn sm" data-act="pl-assinar" data-p="${prod}">${ico('troca')} Trocar de plano</button>`,
    pagar: prod => `<button type="button" class="btn sm pri" data-act="pl-pagar" data-p="${prod}">${ico('ext')} Pagar a fatura</button>`,
    cancelar: prod => `<button type="button" class="btn sm ghost" data-act="pl-cancelar" data-p="${prod}">Cancelar</button>`,
    desistir: prod => `<button type="button" class="btn sm" data-act="pl-desistir" data-p="${prod}">${ico('prev')} Desistir e receber de volta</button>`
  };

  /* a faixa do teste grátis no alto do Hórus e do Studio Houzi ('' quando não tem o que dizer) */
  C.planoFaixa = prod => {
    const A = C.acesso; if(!A || A.fundador || A.dono) return '';
    const p = plano(prod), preco = reais(PRECO[prod]);
    let txt = '', bt = '', forte = false;
    if(!p) txt = `Os 30 dias grátis do ${NOME[prod]} começam no teu primeiro uso. Depois, ${preco} por mês.`;
    else if(!p.acesso){ forte = true; txt = p.status === 'teste' && !p.assinado ? `O teste grátis do ${NOME[prod]} acabou. Assina por ${preco} por mês pra seguir; o que você já fez continua aqui.` : `O ${NOME[prod]} tá parado: ${p.assinado && p.status !== 'cancelada' ? 'a fatura venceu' : 'o plano acabou'}. O que você já fez continua aqui.`; bt = p.assinado && p.status !== 'cancelada' ? 'pagar' : 'assinar'; }
    else if(p.status === 'teste' && !p.assinado && noTeste(p)){ const n = faltam(p.teste_ate); txt = `Teste grátis: ${n === 1 ? 'falta 1 dia' : `faltam ${n} dias`}. Depois, ${preco} por mês.`; bt = 'assinar'; }
    else if(p.status === 'atrasada'){ forte = true; txt = `A fatura do ${NOME[prod]} venceu. Paga até ${ddmm(mais(p.pago_ate || C.hojeBR(), 3))} pra não parar.`; bt = 'pagar'; }
    if(!txt) return '';
    /* v4.31: no app da loja, a faixa só diz como tá (sem preço nem botão de comprar) */
    if(C.naLoja && C.naLoja()){
      if(!p) return '';
      txt = !p.acesso ? `O ${NOME[prod]} tá parado. O que você já fez continua aqui.` : p.status === 'atrasada' ? `A fatura do ${NOME[prod]} venceu.` : `Teste grátis do ${NOME[prod]}: ${faltam(p.teste_ate) === 1 ? 'falta 1 dia' : `faltam ${faltam(p.teste_ate)} dias`}.`;
      return `<div class="pl-faixa${forte ? ' forte' : ''}" role="${forte ? 'alert' : 'status'}">${ico(forte ? 'lock' : 'clock')}<span>${esc(txt)}</span><a class="btn sm ghost" href="#/planos">Planos</a></div>`;
    }
    return `<div class="pl-faixa${forte ? ' forte' : ''}" role="${forte ? 'alert' : 'status'}">${ico(forte ? 'lock' : 'clock')}<span>${esc(txt)}</span>${bt ? BOTAO[bt](prod) : '<a class="btn sm ghost" href="#/planos">Planos</a>'}</div>`;
  };

  /* ---------- a página ---------- */
  function cartao(prod){
    const p = plano(prod), e = estado(prod), loja = !!(C.naLoja && C.naLoja());
    const nv = prod === 'studio' ? (p && p.assinado && p.acesso ? p.nivel : 1) : 0;
    e.bts = e.bts.filter(btLoja);
    const escada = loja ? '' : prod === 'studio' ? `<ul class="pl-escada">${[[1, 'Grátis'], [2, reais(STUDIO[2])], [3, reais(STUDIO[3])], [4, reais(STUDIO[4])]].map(([n, v]) => `<li${n === nv ? ' class="eu"' : ''}><span>${nivelNome(n)}</span><b>${v}</b></li>`).join('')}</ul><p class="pl-mes">por mês</p>`
      : `<p class="pl-preco"><b>${reais(PRECO[prod])}</b> por mês</p>`;
    return `<article class="pl-card${e.fora ? ' fora' : ''}" id="pl-${prod}">
      <header><span class="pl-ico">${ico(ICO[prod])}</span><div><h2>${NOME[prod]}</h2><p>${esc(SOBRE[prod])}</p></div></header>
      ${escada}
      <p class="pl-estado" data-pl-estado>${esc(e.txt)}</p>
      ${DV[prod] ? `<p class="pl-desiste">Mudou de ideia? Até <b>${ddmm(DV[prod].ate)}</b> dá pra desistir e receber os <b>${reais(DV[prod].valor)}</b> de volta.</p>` : ''}
      ${e.bts.length || DV[prod] ? `<div class="acts">${e.bts.concat(DV[prod] ? ['desistir'] : []).map(b => BOTAO[b](prod)).join('')}</div>` : ''}
    </article>`;
  }
  function pinta(){
    const el = C.$('pl'); if(!el) return;
    if(!C.acesso){ el.innerHTML = `<section class="card"><h1 class="ch">Planos</h1><p class="note">Os planos chegam em breve. Por enquanto tá tudo liberado.</p></section>`; return; }
    const loja = !!(C.naLoja && C.naLoja());
    el.innerHTML = `<header class="pl-topo"><p class="pl-kick">Planos</p><h1>${loja ? 'Teus planos' : 'Paga só a ferramenta que trabalha por você.'}</h1>
        <p>${loja ? 'Aqui no app dá pra ver como tá cada plano, cancelar e desistir. Assinar não está disponível no app.' : 'A rede, as mensagens, o Correverso, o Mural e Vendas e Grana são de graça. Pix, boleto ou cartão, pelo Asaas; renova sozinho todo mês e cancela quando quiser, aqui mesmo.'}</p></header>
      <div class="pl-lista">${['studio', 'houzi', 'horus'].map(cartao).join('')}</div>
      ${C.acesso.fundador ? `<article class="pl-card pl-asaas"><header><span class="pl-ico">${ico('cartao')}</span><div><h2>Asaas</h2><p>Só você vê. Confere a chave do Asaas e cadastra lá o aviso de pagamento, com o token certo. Toca de novo sempre que trocar a chave.</p></div></header>
        <p class="pl-estado" id="pl-asaas-st">A chave fica só nos Secrets do Supabase (ASAAS_API_KEY).</p><div class="acts"><button type="button" class="btn sm pri" data-act="pl-asaas">${ico('check')} Ligar o Asaas</button></div></article>` : ''}
      ${loja ? '<p class="fine pl-fine">Tá tudo nos <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a>.</p>' : `<p class="fine pl-fine">O nome e o CPF ou CNPJ vão só pro Asaas, que emite a cobrança: o Corre não guarda. Cancelou, o que já foi pago vale até o fim do mês pago. Desistiu em até 7 dias do primeiro pagamento, devolvemos tudo. Tá tudo nos <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a>.</p>`}`;
  }
  C.views.planos = async function(app){
    document.title = 'Planos · Corre';
    const rota = C.rota;
    app.innerHTML = C.header('planos') + `<main class="wrap"><section class="pl" id="pl"><p class="note">Abrindo os planos…</p></section></main>`;
    await C.acessoCarrega();
    if(rota !== C.rota) return;
    pinta();
    /* v3.61: plano assinado esperando pagamento? Confere direto no Asaas (se o aviso de pagamento não chegou, liga aqui) */
    const P = (C.acesso && C.acesso.planos) || {};
    const espera = Object.keys(P).filter(k => P[k].assinado && P[k].status !== 'cancelada' && (!P[k].acesso || P[k].status === 'pendente' || P[k].status === 'atrasada'));
    if(espera.length){
      const r = await Promise.all(espera.map(k => C.api.fn('pagamento', { acao: 'confere', produto: k }).catch(() => null)));
      if(r.some(x => x && x.ativou) && rota === C.rota){ await C.acessoCarrega(); pinta(); C.toast('Pagamento confirmado. O plano tá ligado.', 3600); }
    }
    await desisteVe(rota);
  };
  /* v3.72: a desistência fica à vista (o Decreto 7.962 pede o caminho claro, no mesmo lugar em que se assinou). Só
     pergunta de plano pago há pouco: o primeiro pagamento cobre um mês, então quem tem menos de 20 dias pela frente já
     passou dos 7 */
  async function desisteVe(rota){
    const A = C.acesso, P = (A && A.planos) || {};
    if(!A || A.fundador || A.dono) return;
    const k = Object.keys(P).filter(x => P[x].assinado && P[x].acesso && P[x].pago_ate && ['ativa', 'cancelada'].includes(P[x].status) && dias(P[x].pago_ate) >= 20);
    const antes = JSON.stringify(DV);
    Object.keys(DV).forEach(x => { if(!k.includes(x)) delete DV[x]; });
    await Promise.all(k.map(async x => {
      const r = await C.api.fn('pagamento', { acao: 'desistir', produto: x, ver: true }).catch(() => null);
      if(r && r.pode) DV[x] = { valor: Number(r.valor) || 0, ate: String(r.ate || ''), boleto: !!r.boleto }; else delete DV[x];
    }));
    if(JSON.stringify(DV) !== antes && rota === C.rota) pinta();
  }

  /* ---------- assinar ---------- */
  const ERRO = { nome: 'Escreve o nome completo (ou a razão social).', doc: 'Confere o CPF ou o CNPJ.', login: 'Entra de novo no Corre e tenta outra vez.',
    config: 'O pagamento ainda não tá ligado no Corre. Tenta mais tarde.', nofn: 'O pagamento ainda não tá ligado no Corre. Tenta mais tarde.', sem_assinatura: 'Não achei a assinatura desse plano.',
    termos: 'Marca que leu e aceita os Termos de uso pra assinar.' };
  const NAO_DESISTE = { prazo: 'Passou dos 7 dias do primeiro pagamento. Dá pra cancelar: não vem mais cobrança.', ja: 'A desistência pelo app já foi usada nesse plano. Escreve pro contato@houzirecords.com.br que a gente resolve.',
    devolvido: 'Esse pagamento já foi devolvido.', sem_pagamento: 'Não achei pagamento pra devolver nesse plano.' };
  const erroTxt = e => (e && e.code === 'asaas' && e.detalhe) ? 'O Asaas recusou: ' + e.detalhe : (e && (ERRO[e.code] || (e.status === 404 && ERRO.nofn))) || C.errMsg(e, 'Não deu pra falar com o pagamento agora.');
  /* a aba da fatura abre no toque (depois de esperar a resposta, o navegador bloqueia a janela nova) */
  const abaNova = () => { if(C.DEMO) return null; try{ return window.open('', '_blank'); }catch(e){ return null; } };
  const leva = (w, link) => { if(!w) return false; if(!link){ try{ w.close(); }catch(e){} return false; } try{ w.opener = null; w.location.href = link; return true; }catch(e){ return false; } };

  function assinarSheet(prod, nivelPedido){
    const A = C.acesso;
    if(!A){ C.toast('Os planos chegam em breve. Por enquanto tá tudo liberado.'); return; }
    const p = plano(prod), ja = !!(p && p.assinado && p.status !== 'cancelada'), teste = noTeste(p);
    const nAtual = ja && prod === 'studio' ? nivelDoValor(p.valor, p.nivel) : 0, nIni = Math.max(2, Math.min(4, nivelPedido || (nAtual ? nAtual : 2)));
    const quando = teste ? `Você tá no teste grátis até ${ddmm(diaDe(p.teste_ate))}: a primeira cobrança vence nesse dia, e nada sai antes.`
      : ja ? 'Muda o valor da próxima fatura em diante.' : 'A primeira fatura vence hoje: ela abre numa aba nova pra pagar no Pix, boleto ou cartão. Pagou, o plano liga sozinho.';
    C.sheet(`<form class="form pl-form" id="pl-f"><div class="sheet-head"><h2>${ja ? 'Trocar de plano' : 'Assinar o ' + NOME[prod]}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${prod === 'studio' ? `<fieldset class="fld pl-niveis"><legend>Quantas redes sociais o Corre acompanha</legend>${[2, 3, 4].map(n => `<label class="pl-nivel"><input type="radio" name="pl-n" value="${n}"${n === nIni ? ' checked' : ''}><span>${nivelNome(n)}${n === nAtual ? ' <small>(o teu hoje)</small>' : ''}</span><b>${reais(STUDIO[n])}</b></label>`).join('')}<small class="hint">A primeira rede social segue de graça; o plano é o total. Por mês.</small></fieldset>`
        : `<p class="pl-preco"><b>${reais(PRECO[prod])}</b> por mês</p>`}
      <p class="note">${esc(quando)}</p>
      ${A.cliente || ja ? '' : `<div class="fld"><label for="pl-nome">Nome completo ou razão social</label><input class="inp" id="pl-nome" maxlength="100" autocomplete="name" required value="${esc((C.st.me && C.st.me.nome) || '')}"></div>
      <div class="fld"><label for="pl-doc">CPF ou CNPJ</label><input class="inp" id="pl-doc" inputmode="numeric" maxlength="18" autocomplete="off" required aria-describedby="pl-doc-h"><span class="hint" id="pl-doc-h">Vai só pro Asaas, que emite a cobrança. O Corre não guarda.</span></div>`}
      <label class="pl-aceite"><input type="checkbox" id="pl-termos" required><span>Li e aceito os <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a>. Renova sozinho todo mês até eu cancelar; desistindo em até 7 dias do primeiro pagamento, recebo tudo de volta.</span></label>
      <p class="fine" id="pl-erro" role="alert" hidden></p>
      <div class="acts"><button type="submit" class="btn pri">${ja ? 'Trocar' : teste ? 'Assinar (sem cobrar agora)' : 'Assinar e pagar'}</button><button type="button" class="btn ghost" data-close>Agora não</button></div>
      <p class="fine">Cancela quando quiser, em Financeiro › Planos.</p>
    </form>`);
    C.umaVez(C.$('pl-f'), async () => {
      const er = C.$('pl-erro'), mostra = t => { if(er){ er.textContent = t; er.hidden = false; } else C.toast(t); };
      const body = { acao: 'assinar', produto: prod, termos: TERMOS_V };
      /* o navegador já segura (required), mas a folha refeita ou um leitor de tela podem passar: confere aqui também */
      const tm = C.$('pl-termos'); if(tm && !tm.checked){ mostra(ERRO.termos); tm.focus(); return; }
      if(prod === 'studio') body.nivel = Number((document.querySelector('input[name="pl-n"]:checked') || {}).value) || 2;
      if(prod === 'studio' && ja && body.nivel === nAtual){ C.closeSheet(); return; }
      const nm = C.$('pl-nome'), dc = C.$('pl-doc');
      if(nm){ body.nome = nm.value.replace(/\s+/g, ' ').trim(); if(body.nome.length < 3){ mostra(ERRO.nome); nm.focus(); return; } }
      if(dc){ body.doc = C.docOk(dc.value); if(!body.doc){ mostra(ERRO.doc); dc.focus(); return; } }
      const w = !teste && !ja ? abaNova() : null;
      try{
        const r = await C.api.fn('pagamento', body) || {};
        const abriu = leva(w, r.link);
        await C.acessoCarrega();
        if(r.link && !abriu && !teste && !ja){
          /* o navegador barrou a aba nova: o link fica na folha, num toque */
          const f = C.$('pl-f'); if(f) f.innerHTML = `<div class="sheet-head"><h2>Falta pagar</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><p class="note">A assinatura tá feita. Abre a fatura pra pagar no Pix, boleto ou cartão; pagou, o plano liga sozinho.</p><div class="acts"><a class="btn pri" href="${esc(r.link)}" target="_blank" rel="noopener">${ico('ext')} Abrir a fatura</a></div>`;
          C.refreshPlanos(); return;
        }
        C.closeSheet();
        C.toast(r.demo ? (r.teste ? 'Assinado (demonstração: nada foi cobrado).' : 'Plano ligado (demonstração: nada foi cobrado).')
          : r.trocou ? 'Pedido feito. O plano novo vale quando a fatura com o valor novo for paga (dá pra pagar agora, em Pagar a fatura).' : r.teste ? `Assinado. A primeira cobrança vence em ${ddmm(r.vence)}.` : abriu ? 'A fatura abriu numa aba nova. Pagou, o plano liga sozinho.' : 'Assinado. A fatura também vai pro teu e-mail.', 4200);
        C.refreshPlanos();
      }catch(err){
        leva(w, '');
        /* o cadastro do Asaas sumiu (troca do sandbox pra conta de verdade, por exemplo): pede nome e CPF de novo */
        if(err && (err.code === 'nome' || err.code === 'doc') && !C.$('pl-nome') && C.acesso){ C.acesso.cliente = false; assinarSheet(prod, body.nivel); const e2 = C.$('pl-erro'); if(e2){ e2.textContent = 'Confirma teu nome e CPF ou CNPJ pra assinar.'; e2.hidden = false; } const t2 = C.$('pl-termos'); if(t2) t2.checked = true; return; }
        mostra(erroTxt(err));
      }
    });
  }
  /* v3.61: antes de apagar o perfil, cancela o que tá rodando no Asaas (senão a cobrança seguiria) */
  async function cancelaTudo(){
    await C.acessoCarrega();
    const P = (C.acesso && C.acesso.planos) || {};
    for(const prod of Object.keys(P)) if(P[prod].assinado && P[prod].status !== 'cancelada') await C.api.fn('pagamento', { acao: 'cancelar', produto: prod });
  }
  /* depois de assinar, pagar ou cancelar: a página aberta (Planos, Hórus, Studio Houzi, Studio) se refaz */
  C.refreshPlanos = () => { if(C.$('pl')){ pinta(); desisteVe(C.rota); } else C.refresh(); };
  C.planos = { assinar: assinarSheet, nome: NOME, preco: precoDe, cancelaTudo };

  Object.assign(C.acts, {
    /* só o fundador: a função confere a chave e cadastra o webhook no Asaas (o token nunca passa pela tela) */
    'pl-asaas': async el => {
      const st = C.$('pl-asaas-st'), diz = (t, ruim) => { if(st){ st.textContent = t; st.classList.toggle('ruim', !!ruim); } };
      el.disabled = true; diz('Falando com o Asaas…');
      try{
        const r = await C.api.fn('pagamento', { acao: 'asaas' }) || {};
        diz(r.ambiente === 'sandbox' ? 'Ligado no sandbox (teste, sem dinheiro de verdade). O aviso de pagamento tá cadastrado.' : r.ambiente === 'demo' ? 'Demonstração: nada foi pro Asaas.' : 'Ligado na conta de verdade. O aviso de pagamento tá cadastrado no Asaas.');
      }catch(e){
        diz(e && e.code === 'config' ? 'Falta a chave: Supabase › Edge Functions › Secrets › ASAAS_API_KEY.' : e && e.code === 'asaas' ? 'O Asaas respondeu: ' + (e.detalhe || 'erro') : e && (e.code === 'nofn' || e.status === 404) ? 'A função pagamento ainda não tá no ar.' : erroTxt(e), true);
      }finally{ if(el.isConnected) el.disabled = false; }
    },
    'pl-assinar': el => { if(C.naLoja && C.naLoja()){ C.toast('Assinar não está disponível no app.', 3600); return; } assinarSheet(el.dataset.p, Number(el.dataset.n) || 0); },
    'pl-pagar': async el => {
      if(C.naLoja && C.naLoja()){ C.toast('Pagar não está disponível no app.', 3600); return; }
      const prod = el.dataset.p, p = plano(prod);
      if(C.DEMO){ C.toast('Na demonstração não tem fatura de verdade.'); return; }
      const w = abaNova(); el.disabled = true;
      try{
        const r = await C.api.fn('pagamento', { acao: 'link', produto: prod }) || {}, link = r.link || (p && p.link) || '';
        if(!link){ leva(w, ''); C.toast('Nenhuma fatura em aberto agora. Se acabou de pagar, o plano liga em instantes.', 4200); return; }
        if(!leva(w, link)) C.sheet(`<div class="form"><div class="sheet-head"><h2>A fatura</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><p class="note">Pix, boleto ou cartão. Pagou, o plano liga sozinho.</p><div class="acts"><a class="btn pri" href="${esc(link)}" target="_blank" rel="noopener">${ico('ext')} Abrir a fatura</a></div></div>`);
      }catch(err){ leva(w, ''); C.toast(erroTxt(err)); }
      finally{ if(el.isConnected) el.disabled = false; }
    },
    'pl-cancelar': async el => {
      const prod = el.dataset.p, p = plano(prod);
      const fim = p && [p.pago_ate ? mais(p.pago_ate, 3) : '', diaDe(p.teste_ate)].filter(Boolean).sort().pop();
      const dv = DV[prod];
      const sim = await C.confirma({ ico: 'cartao', titulo: `Cancelar o ${NOME[prod]}?`, texto: (fim && fim >= C.hojeBR() ? `Não vem mais cobrança. O que já foi pago vale até <b>${ddmm(fim)}</b>.` : 'Não vem mais cobrança, e o plano para.')
        + (dv ? ` Quer o dinheiro de volta? Até ${ddmm(dv.ate)}, toca em <b>Desistir e receber de volta</b>.` : ''), sim: dv ? 'Só cancelar' : 'Cancelar o plano', nao: 'Manter' });
      if(!sim) return;
      el.disabled = true;
      try{ await C.api.fn('pagamento', { acao: 'cancelar', produto: prod }); await C.acessoCarrega(); C.toast('Plano cancelado.'); C.refreshPlanos(); }
      catch(err){ C.toast(erroTxt(err)); if(el.isConnected) el.disabled = false; }
    },
    /* v3.72: o direito de arrependimento (CDC, art. 49): até 7 dias do primeiro pagamento, devolve tudo e o plano para */
    'pl-desistir': async el => {
      const prod = el.dataset.p, dv = DV[prod]; if(!dv) return;
      const sim = await C.confirma({ ico: 'cartao', titulo: `Desistir do ${NOME[prod]}?`,
        texto: `Você recebe os <b>${reais(dv.valor)}</b> de volta${dv.boleto ? ' (foi no boleto: o Asaas pede a conta onde você quer receber)' : ''}. O plano para agora e não vem mais cobrança.`, sim: 'Desistir e receber de volta', nao: 'Manter o plano' });
      if(!sim) return;
      el.disabled = true;
      try{
        const r = await C.api.fn('pagamento', { acao: 'desistir', produto: prod }) || {};
        delete DV[prod]; await C.acessoCarrega(); C.refreshPlanos();
        if(r.pode === false){ C.toast(NAO_DESISTE[r.motivo] || NAO_DESISTE.sem_pagamento, 5200); return; }
        if(r.boleto) C.sheet(`<div class="form"><div class="sheet-head"><h2>Falta dizer a conta</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
          <p class="note">O plano parou. O boleto não volta sozinho: ${r.link ? 'abre o link do Asaas e diz em qual conta você quer receber os ' + esc(reais(r.devolvido)) + '.' : 'escreve pro <a href="mailto:contato@houzirecords.com.br">contato@houzirecords.com.br</a> com o teu @ e a conta onde quer receber.'}</p>
          ${r.link ? `<div class="acts"><a class="btn pri" href="${esc(r.link)}" target="_blank" rel="noopener">${ico('ext')} Dizer a conta</a></div>` : ''}</div>`);
        else C.toast(`Pronto: os ${reais(r.devolvido)} tão voltando${r.demo ? ' (demonstração: nada foi cobrado)' : ' (no Pix, pra conta que pagou; no cartão, na fatura dele)'}. O plano parou.`, 6000);
      }catch(err){ C.toast(erroTxt(err)); if(el.isConnected) el.disabled = false; }
    }
  });
})();
