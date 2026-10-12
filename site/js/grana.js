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
    const neg = /^\(.*\)$/.test(s) || /-$/.test(s); s = s.replace(/[()]/g, '').replace(/-$/, '');
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
        <div class="g-mes"><button type="button" class="cbtn" data-act="g-mes" data-k="-1" aria-label="Mês anterior">${ico('prev')}</button><h2>${mesNome(G.mes)}</h2><button type="button" class="cbtn" data-act="g-mes" data-k="1" aria-label="Próximo mês"${G.mes >= C.hojeBR().slice(0, 7) ? ' disabled' : ''}>${ico('next')}</button></div>
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
    C.$('g-cf').addEventListener('submit', async e => {
      e.preventDefault();
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
    C.$('g-lf').addEventListener('submit', async e => {
      e.preventDefault();
      const tp = Number((document.querySelector('input[name="g-tp"]:checked') || {}).value || 1), v = Math.abs(num(C.$('g-vl').value));
      if(!isFinite(v) || !v){ C.toast('Coloca o valor.'); C.$('g-vl').focus(); return; }
      const tr = C.$('g-tr') && C.$('g-tr').checked;
      const row = { conta_id: C.$('g-ct') ? C.$('g-ct').value : contaId, data: C.$('g-dt').value, valor: Math.round(v * tp * 100) / 100, descricao: C.$('g-ds').value.trim() || (tr ? TRANSF_N : tp > 0 ? 'Entrada' : 'Saída'), cliente: tp > 0 && !tr ? C.$('g-cl').value.trim() : '', categoria: tr ? TRANSF : tp > 0 ? (C.$('g-cl').value.trim() ? 'venda' : (l && !ehTr(l) && l.categoria) || '') : (C.$('g-ca').value === TRANSF ? '' : C.$('g-ca').value) };
      try{
        if(l) await C.api.upd('corre_lancamentos', { id: l.id }, row);
        else await C.api.ins('corre_lancamentos', Object.assign(row, { origem: 'manual' }));
        C.closeSheet(); G.mes = row.data.slice(0, 7); await carregar(); render(); C.toast(l ? 'Lançamento salvo.' : 'Lançado.');
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
        C.closeSheet(); G.mes = ds[ds.length - 1].slice(0, 7); await carregar(); render();
        C.toast(nNovos ? `${nNovos} lançamentos novos.` : 'Tudo isso já estava aqui.');
      }catch(err){ C.toast(C.errMsg(err)); ev.target.disabled = false; ev.target.textContent = 'Importar'; }
    });
  }

  Object.assign(C.acts, {
    'g-robo-quero': async el => { el.disabled = true; try{ const f = Object.assign({}, (C.st.me && C.st.me.ferramentas) || {}, { robo: 'lista' }); await C.saveMe({ ferramentas: f }); C.toast('Tá na lista do robô. A gente te chama quando abrir.', 3600); const b = C.$('g-robo'); if(b) b.outerHTML = roboHTML(); }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); } },
    'g-mes': el => { G.mes = addMes(G.mes, Number(el.dataset.k)); render(); },
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
