/* CORRE · HÓRUS: o radar de clientes. É a ferramenta dorsal do Corre:
   caça empresa → calor de 0 a 100 → alvos do dia → cadência D0·D2·D5·D9 com o WhatsApp pronto →
   placar de toques → fechou, vira marca no Portfólio → a grana dela aparece na Grana.
   Cada pessoa ajusta o que vende, os nichos (com a "pergunta que dói" de cada um) e as mensagens.
   HÓRUS BRASIL: a caça é por praça (qualquer cidade do país, por UF). Cada lead guarda a cidade e a UF,
   o DDD sai da cidade quando o número vem sem, e o "Bom dia" segue o fuso de onde a empresa está. */
(function(){
  'use strict';
  const C = window.Corre, PRE = window.CORRE_HORUS_PRESETS || {}, { esc, ico } = C;
  const STAGES = [['novo', 'Novo'], ['contato', 'Contatado'], ['interesse', 'Interessado'], ['link', 'Proposta'], ['fechado', 'Fechado'], ['perdido', 'Perdido'], ['nao_encontrado', 'Não encontrado']];
  const SN = Object.fromEntries(STAGES);
  const OPEN = ['contato', 'interesse', 'link'], DONE = ['fechado', 'perdido', 'nao_encontrado'];
  const CAD = [{ d: 0, k: 'abordagem', n: 'D0 · Abordagem' }, { d: 2, k: 'retomar', n: 'D2 · Retomar' }, { d: 5, k: 'mostra', n: 'D5 · Mostra' }, { d: 9, k: 'ultimo', n: 'D9 · Último toque' }];
  const TPL = [['abordagem', 'D0 · Abordagem', 'Primeiro contato: a pergunta que dói do nicho e o pedido.'], ['retomar', 'D2 · Retomar', 'Sem resposta em 2 dias. Uma linha, o gancho.'], ['mostra', 'D5 · Mostra', 'Mostra o trabalho na prática.'], ['ultimo', 'D9 · Último toque', 'Fecha a porta com educação.'], ['interesse', 'Interessado', 'Respondeu com interesse: marca a conversa.'], ['link', 'Fechar', 'Disse sim: manda o link ou a proposta.']];
  const TN = Object.fromEntries(TPL.map(t => [t[0], t[1]]));
  const PRIO = { hot: 'Quente', warm: 'Morno', cold: 'Frio' };
  const COL = { hot: [255, 90, 60], warm: [255, 176, 32], cold: [90, 169, 255] };
  const T = () => C.horusTurbo; /* Hórus 3.0: caça automática, mapa e rota, IA e placar que vende (horus-turbo.js) */
  const H = { ia: {}, cmodo: 'auto', leads: [], by: {}, f: 'todos', q: '', st: 'abertos', pf: '', skip: {}, rows: null, paste: '', assunto: '', mode: 'calor', more: 60, loaded: false };

  /* ---------- FARO: sinais públicos de que a empresa precisa do que você vende ---------- */
  const SINAIS = {
    sem_site: { n: 'sem site', frase: 'vi que a {empresa} ainda não tem site' },
    sem_insta: { n: 'sem Instagram', frase: 'não achei o Instagram da {empresa}' },
    so_fixo: { n: 'só fixo', frase: 'o contato de vocês no mapa é só o telefone fixo' },
    sem_horario: { n: 'sem horário no mapa', frase: 'o horário de vocês nem aparece no mapa' },
    rede: { n: 'várias unidades', frase: 'vi que vocês têm mais de uma unidade' },
    nova: { n: 'abriu há pouco', frase: 'vi que vocês abriram há pouco tempo' },
    aberto_tarde: { n: 'abre até tarde', frase: 'vocês ficam abertos até tarde' },
    '24h': { n: 'abre 24 h', frase: 'vocês funcionam 24 horas' }
  };
  const DIGITAL_RE = /social|m[ií]dia|marketing|site|tr[aá]fego|design|conte[uú]do|ag[eê]ncia|ads|google|instagram|v[ií]deo|foto|branding|identidade|seo|loja virtual|e-?commerce/i;
  const faroPadrao = oferta => DIGITAL_RE.test(oferta || '') ? ['sem_site', 'sem_insta', 'sem_horario', 'so_fixo', 'nova'] : ['rede', 'nova', 'aberto_tarde', '24h'];
  const sinaisDe = l => (Array.isArray(l.sinais) ? l.sinais : []).filter(k => SINAIS[k]);
  const faroDe = l => { const f = cfg().faro; return sinaisDe(l).filter(k => f.includes(k)); };

  /* ---------- Brasil: UFs, DDDs, fusos e cidades ---------- */
  const UFS = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
    ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
    ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
  const UFN = Object.fromEntries(UFS);
  const DDD_UF = { AC: ['68'], AL: ['82'], AM: ['92', '97'], AP: ['96'], BA: ['71', '73', '74', '75', '77'], CE: ['85', '88'], DF: ['61'], ES: ['27', '28'], GO: ['62', '64', '61'], MA: ['98', '99'],
    MG: ['31', '32', '33', '34', '35', '37', '38'], MS: ['67'], MT: ['65', '66'], PA: ['91', '93', '94'], PB: ['83'], PE: ['81', '87'], PI: ['86', '89'], PR: ['41', '42', '43', '44', '45', '46'],
    RJ: ['21', '22', '24'], RN: ['84'], RO: ['69'], RR: ['95'], RS: ['51', '53', '54', '55'], SC: ['47', '48', '49'], SE: ['79'], SP: ['11', '12', '13', '14', '15', '16', '17', '18', '19'], TO: ['63'] };
  const TZ_UF = { AC: 'America/Rio_Branco', AM: 'America/Manaus', RR: 'America/Boa_Vista', RO: 'America/Porto_Velho', MT: 'America/Cuiaba', MS: 'America/Campo_Grande' };
  const tzDe = uf => TZ_UF[uf] || 'America/Sao_Paulo';
  const horaEm = (uf, d) => { const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tzDe(uf) }).format(d || new Date()).split(':').map(Number); return { h: p[0] % 24, m: p[1] }; };
  const oiEm = uf => { const h = horaEm(uf).h; return h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!'; };
  /* "Londrina, PR", "Londrina - PR", "Londrina/PR" → { cidade, uf } */
  function parseLugar(s){
    const t = String(s || '').trim(); if(!t) return { cidade: '', uf: '' };
    const m = t.match(/^(.*?)\s*(?:,|-|–|\/)\s*([A-Za-z]{2})\s*(?:,.*)?$/);
    if(m && UFN[m[2].toUpperCase()]) return { cidade: m[1].trim(), uf: m[2].toUpperCase() };
    return { cidade: t.split(',')[0].trim(), uf: '' };
  }
  const lugarTxt = (cid, uf) => cid ? (uf ? `${cid}/${uf}` : cid) : '';
  const store = { get(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  /* as cidades de cada UF (IBGE), guardadas no aparelho */
  const MUN = {};
  async function municipios(uf){
    if(!UFN[uf]) return [];
    if(MUN[uf]) return MUN[uf];
    const k = 'corre-ibge-' + uf, salvo = store.get(k);
    if(Array.isArray(salvo) && salvo.length) return (MUN[uf] = salvo);
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?view=nivelado`, { headers: { Accept: 'application/json' } });
    if(!r.ok) throw { code: 'ibge' };
    const lista = (await r.json()).map(m => m['municipio-nome']).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    store.set(k, lista); return (MUN[uf] = lista);
  }
  /* DDD da cidade: UF com um DDD só resolve na hora; com vários, pergunta pra BrasilAPI quais cidades cada DDD atende */
  async function dddDe(cidade, uf){
    const ds = DDD_UF[uf] || []; if(!ds.length || !cidade) return '';
    if(ds.length === 1 || uf === 'DF') return ds[0];
    const nc = C.norm(cidade), cache = store.get('corre-ddd-v1') || {};
    let achou = '';
    for(const d of ds){
      if(!cache[d]){
        try{ const r = await fetch('https://brasilapi.com.br/api/ddd/v1/' + d); if(r.ok){ const j = await r.json(); cache[d] = (j.cities || []).map(x => C.norm(x)); } }catch(e){}
      }
      if((cache[d] || []).includes(nc)){ achou = d; break; }
    }
    store.set('corre-ddd-v1', cache);
    return achou;
  }

  /* ---------- datas ---------- */
  const today = () => C.hojeBR();
  const addDays = (n, from) => { const d = new Date((from || today()) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const localDay = t => { try{ return C.hojeBR(new Date(t)); }catch(e){ return ''; } };
  const ddmm = C.ddmm;

  /* ---------- configuração (fica no perfil: horus) ---------- */
  /* o que é só teu (ponto de saída da rota, valor e meta de fechamento, recorde do sprint) fica numa linha só tua
     (corre_estilo.horus_priv), nunca no perfil, que é público */
  const PRIV_K = ['base', 'valorFech', 'metaFech', 'sprint'];
  const PV = { uid: null, v: {}, p: null };
  function privCarrega(){
    const uid = C.uid(); if(!uid) return Promise.resolve({});
    if(PV.uid === uid && PV.p) return PV.p;
    PV.uid = uid; PV.v = {};
    PV.p = C.api.one('corre_estilo', { eq: { dono: uid } }).then(r => (PV.v = r && r.horus_priv && typeof r.horus_priv === 'object' ? r.horus_priv : {})).catch(() => { PV.p = null; return (PV.v = {}); });
    return PV.p;
  }
  function cfg(){
    const me = C.st.me || {}, h = Object.assign({}, me.horus || {}, PV.uid && PV.uid === C.uid() ? PV.v : {});
    const pre = PRE[h.preset] || PRE.padrao || { nichos: [], tpl: {} };
    if(!Array.isArray(h.nichos) || !h.nichos.length) h.nichos = pre.nichos;
    h.tpl = Object.assign({}, pre.tpl, h.tpl || {});
    h.eu = h.eu || C.firstName(me.nome);
    h.oferta = h.oferta != null ? h.oferta : (pre.oferta || '');
    h.link = h.link || '';
    const meu = parseLugar(me.cidade);
    h.cidade = h.cidade || meu.cidade || 'tua cidade';
    h.uf = h.uf || meu.uf || '';
    /* praça: onde a caça tá apontada agora (qualquer cidade do Brasil). Sem escolher, é a tua cidade. */
    const pr = h.praca && h.praca.cidade ? h.praca : { cidade: h.cidade === 'tua cidade' ? '' : h.cidade, uf: h.uf, ddd: '' };
    h.praca = { cidade: String(pr.cidade || ''), uf: String(pr.uf || ''), ddd: String(pr.ddd || '') };
    h.pracas = Array.isArray(h.pracas) ? h.pracas.filter(x => x && x.cidade).slice(0, 8) : [];
    h.meta = Math.max(1, Math.min(80, +h.meta || 15));
    h.faro = Array.isArray(h.faro) ? h.faro.filter(k => SINAIS[k]) : faroPadrao(h.oferta);
    return h;
  }
  async function saveCfg(patch){
    const pub = {}, priv = {}, velho = (C.st.me && C.st.me.horus) || {};
    Object.keys(patch || {}).forEach(k => { (PRIV_K.includes(k) ? priv : pub)[k] = patch[k]; });
    if(Object.keys(priv).length){
      await privCarrega();
      const novo = Object.assign({}, PV.v, priv);
      await C.api.upsert('corre_estilo', [{ dono: C.uid(), horus_priv: novo }], 'dono');
      PV.v = novo;
    }
    const sujo = PRIV_K.some(k => k in velho);
    if(Object.keys(pub).length || sujo){ const cur = Object.assign({}, velho, pub); PRIV_K.forEach(k => { delete cur[k]; }); await C.saveMe({ horus: cur }); }
  }
  const ALL_N = Object.values(PRE).flatMap(p => p.nichos || []);
  const nichoOf = l => { const c = cfg(); return c.nichos.find(n => n.k === l.nicho) || Object.assign({ hook: '', valor: '', gancho: '' }, ALL_N.find(n => n.k === l.nicho) || {}, { k: l.nicho || '', prio: 'warm' }, { n: (ALL_N.find(n => n.k === l.nicho) || {}).n || l.nicho || 'Sem nicho' }); };
  function guessNicho(txt){
    const c = cfg();
    for(const n of c.nichos){ if(n.re){ try{ if(new RegExp(n.re, 'i').test(txt)) return n.k; }catch(e){} } }
    const o = c.nichos.find(n => /outro/i.test(n.k)); return (o || c.nichos[c.nichos.length - 1] || {}).k || '';
  }

  /* ---------- lead ---------- */
  const shortName = s => String(s || '').replace(/\s+(ltda|me|epp|eireli|s\/?a|s\.a\.)\.?$/i, '').replace(/\s+[-–|].*$/, '').trim() || String(s || '');
  const digits = l => l.wa || l.fixo || '';
  const waNum = d => (d.length >= 12 && d.startsWith('55') ? d : '55' + d);
  /* WhatsApp: o celular; sem celular, o fixo (muita empresa usa WhatsApp Business no fixo); sem nenhum, o WhatsApp abre pra escolher o contato */
  const waDe = l => String(l.wa || l.fixo || '');
  const waUrl = (l, txt) => `https://wa.me/${waDe(l) ? waNum(waDe(l)) : ''}?text=${encodeURIComponent(txt)}`;
  const fmtTel = d => { d = String(d || ''); if(d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if(d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return d; };
  function phoneOf(raw, ddd){
    let d = String(raw || '').replace(/\D/g, '');
    if(d.length > 11 && d.startsWith('55')) d = d.slice(2);
    if(d.length === 11 && d[0] === '0') d = d.slice(1);
    if(d.length === 12 && d[0] === '0') d = d.slice(1);
    /* número sem DDD: usa o DDD da praça (cidade) quando o Hórus sabe qual é */
    if((d.length === 8 || d.length === 9) && /^\d{2}$/.test(ddd || '')) d = ddd + d;
    if(d.length === 8 || d.length === 9) return null;
    if(d.length === 11 && d[2] === '9') return { wa: d, fixo: '', fmt: fmtTel(d) };
    if(d.length === 10) return /^[6-9]/.test(d[2]) ? { wa: d.slice(0, 2) + '9' + d.slice(2), fixo: '', fmt: fmtTel(d.slice(0, 2) + '9' + d.slice(2)) } : { wa: '', fixo: d, fmt: fmtTel(d) };
    return null;
  }
  const lastTouch = l => { const h = (l.hist || []).find(x => x.k === 'toque' || x.k === 'res' || x.k === 'visita'); return h && h.t ? localDay(h.t) : null; };
  const responded = l => (l.hist || []).some(h => h.k === 'res' && !/^Sem resposta/.test(h.v || ''));
  const isDue = l => !DONE.includes(l.st) && l.prox && l.prox <= today();
  const isFresh = l => l.created_at && daysBetween(String(l.created_at).slice(0, 10), today()) <= 3 && l.st === 'novo';
  function esfriando(l){
    if(!OPEN.includes(l.st)) return 0; if(l.prox && l.prox >= today()) return 0;
    const lt = lastTouch(l); if(!lt) return 0; const d = daysBetween(lt, today()); return d >= 7 ? d : 0;
  }
  function heat(l){
    if(DONE.includes(l.st)) return 0;
    let h = { hot: 38, warm: 26, cold: 14 }[nichoOf(l).prio] || 22;
    h += { novo: 0, contato: 8, interesse: 26, link: 32 }[l.st] || 0;
    h += (+l.potencial || 0) * 5;
    if(l.wa) h += 10; else if(l.fixo) h += 2; else h = Math.min(h, 14);
    if(responded(l)) h += 10;
    if(l.prox){ const t = today(); if(l.prox < t) h += 14 + Math.min(6, daysBetween(l.prox, t)); else if(l.prox === t) h += 10; }
    const lt = lastTouch(l); if(lt && daysBetween(lt, today()) <= 3) h += 4;
    if(esfriando(l)) h -= 8;
    if(l.cad && l.cad.fim) h -= 18;
    if(isFresh(l)) h += 4;
    h += Math.min(18, faroDe(l).length * 7);
    if(pediuLink(l) || escolheuMural(l)) h += 30;
    return Math.max(1, Math.min(100, Math.round(h)));
  }
  /* pediu orçamento pelo link nos últimos 7 dias e ninguém respondeu ainda */
  /* Mural: quem pediu escolheu a tua proposta (o WhatsApp chegou) e você ainda não chamou */
  const escolheuMural = l => l.fonte === 'mural' && l.st === 'interesse' && (() => { const h = l.hist || [], i = h.findIndex(x => /escolheu tua proposta/.test(x.v || '')); return i >= 0 && !h.slice(0, i).some(x => x.k === 'toque'); })();
  const pediuLink = l => l.fonte === 'link' && !DONE.includes(l.st) && l.created_at && daysBetween(String(l.created_at).slice(0, 10), today()) <= 7 && !(l.hist || []).some(x => x.k === 'toque');
  const tempOf = h => h >= 60 ? 'hot' : h >= 38 ? 'warm' : 'cold';
  const TEMP = { hot: 'quente', warm: 'morno', cold: 'frio' };
  function reasons(l){
    const r = [], t = today();
    if(pediuLink(l)) r.push('pediu orçamento');
    if(escolheuMural(l)) r.push('te escolheu no Mural'); else if(l.fonte === 'mural') r.push('Mural');
    const fr = faroDe(l); if(fr.length) r.push('faro: ' + SINAIS[fr[0]].n);
    if(l.prox && l.prox < t && !DONE.includes(l.st)) r.push(`venceu há ${daysBetween(l.prox, t)}d`); else if(l.prox === t) r.push('retorno hoje');
    if(l.st === 'link') r.push('proposta na mesa'); else if(l.st === 'interesse') r.push('interessado');
    if(responded(l) && l.st !== 'interesse') r.push('respondeu');
    const e = esfriando(l); if(e) r.push(`esfriando há ${e}d`);
    if(+l.potencial >= 2) r.push('ticket alto');
    if(isFresh(l)) r.push('caça nova');
    if(!l.wa) r.push(l.fixo ? 'só fixo' : 'sem telefone');
    return r.slice(0, 3);
  }
  function cadStep(l){
    if(l.st === 'novo') return 0;
    if(l.st !== 'contato' || responded(l)) return null;
    if(!l.cad) return 1;
    return Math.min(+l.cad.step || 1, CAD.length);
  }
  const defaultMsg = l => ({ novo: 'abordagem', contato: 'retomar', interesse: 'interesse', link: 'retomar', fechado: 'link' })[l.st] || 'abordagem';
  function nextMsg(l){
    const s = cadStep(l);
    if(s == null){ const k = defaultMsg(l); return { k, n: TN[k] || 'Mensagem', cad: false }; }
    if(s >= CAD.length) return null;
    return { k: CAD[s].k, n: CAD[s].n, cad: true };
  }
  function compose(l, key){
    const c = cfg(), n = nichoOf(l);
    /* "Bom dia" no horário de onde a empresa está; {cidade} = a cidade da empresa; {minha_cidade} = a tua */
    const fr = faroDe(l);
    const v = { sinal: fr.length ? `Dei uma olhada na {empresa} e ${SINAIS[fr[0]].frase}.` : '', oi: oiEm(l.uf || c.praca.uf || c.uf), eu: c.eu, empresa: shortName(l.nome), nicho: String(n.n || '').toLowerCase(), oferta: c.oferta, link: c.link, cidade: l.cidade || c.cidade, minha_cidade: c.cidade, hook: n.hook || '', valor: n.valor || '', gancho: n.gancho || '' };
    let txt = String(c.tpl[key] || '');
    txt = txt.replace(/\{(hook|valor|gancho|sinal)\}/g, (_, k) => v[k]);
    txt = txt.replace(/\{(oi|eu|empresa|nicho|oferta|link|minha_cidade|cidade)\}/g, (_, k) => v[k]);
    return txt.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').replace(/ ([.,!?])/g, '$1').trim();
  }

  /* ---------- gravar ---------- */
  function logH(l, k, val){ l.hist = Array.isArray(l.hist) ? l.hist.slice() : []; l.hist.unshift({ t: new Date().toISOString(), k, v: val }); if(l.hist.length > 40) l.hist.length = 40; }
  async function save(l, fields){
    const patch = {}; fields.forEach(f => patch[f] = l[f] === undefined ? null : l[f]);
    try{ await C.api.upd('corre_leads', { id: l.id }, patch); return true; }
    catch(e){ C.toast(C.errMsg(e, 'Não deu pra salvar o lead.')); return false; }
  }
  async function fire(id, how){
    const l = H.by[id]; if(!l) return;
    how = how || 'WhatsApp';
    const s = cadStep(l), m = nextMsg(l), ia = H.ia[id] ? ' · IA' : ''; delete H.ia[id];
    if(s != null && s < CAD.length){
      if(s === 0 || !l.cad) l.cad = { ini: today(), step: s };
      l.cad = Object.assign({}, l.cad, { step: s + 1 });
      if(l.st === 'novo') l.st = 'contato';
      const nx = CAD[s + 1];
      if(nx){ const p = addDays(nx.d, l.cad.ini); l.prox = p > today() ? p : addDays(1); delete l.cad.fim; }
      else { l.prox = null; l.cad.fim = today(); }
      logH(l, 'toque', `${how} · ${CAD[s].n}${ia}`);
      C.toast(nx ? `${shortName(l.nome)}: ${CAD[s].n.replace(/^D\d · /, '')} ${how === 'Ligação' ? 'feita' : 'enviada'}. Próximo toque ${ddmm(l.prox)}.` : `${shortName(l.nome)}: último toque da cadência.`, 3200);
    } else {
      logH(l, 'toque', `${how} · ${m ? m.n : 'Mensagem'}${ia}`);
      C.toast(`${shortName(l.nome)}: ${how === 'Ligação' ? 'ligação registrada' : 'mensagem enviada'}.`);
    }
    H.skip[id] = true;
    await save(l, ['st', 'cad', 'prox', 'hist']);
    paint();
  }

  /* ---------- placar e fila ---------- */
  function placar(){
    const meta = cfg().meta, days = {};
    const bump = (d, k) => { const x = days[d] || (days[d] = { toques: 0, resp: 0, fech: 0 }); x[k]++; };
    H.leads.forEach(l => (l.hist || []).forEach(h => {
      if(!h || !h.t) return; const d = localDay(h.t);
      if(h.k === 'toque') bump(d, 'toques'); else if(h.k === 'res' && !/^Sem resposta/.test(h.v || '')) bump(d, 'resp'); else if(h.k === 'st' && /Fechado/.test(h.v || '')) bump(d, 'fech');
    }));
    const t = today(), hoje = (days[t] || {}).toques || 0;
    let streak = 0, d = hoje >= meta ? t : addDays(-1);
    while((days[d] || {}).toques >= meta && streak < 400){ streak++; d = addDays(-1, d); }
    const dow = (new Date(t + 'T12:00:00Z').getUTCDay() + 6) % 7, wk = { toques: 0, resp: 0, fech: 0 }, bars = [];
    for(let i = 0; i < 7; i++){ const di = addDays(i - dow); const x = days[di] || {}; if(i <= dow) ['toques', 'resp', 'fech'].forEach(k => wk[k] += x[k] || 0); bars.push({ d: di, n: x.toques || 0, fut: i > dow }); }
    return { meta, hoje, streak, wk, bars };
  }
  function fila(){
    const p = placar();
    const due = H.leads.filter(l => isDue(l) && !H.skip[l.id] && digits(l) && nextMsg(l)).map(l => ({ l, h: heat(l) })).sort((a, b) => b.h - a.h);
    const room = Math.max(0, p.meta - p.hoje - due.length);
    const novos = room ? H.leads.filter(l => l.st === 'novo' && digits(l) && !H.skip[l.id] && !l.prox).map(l => ({ l, h: heat(l) + (l.wa ? 100 : 0) })).sort((a, b) => b.h - a.h).slice(0, room).map(o => ({ l: o.l, h: heat(o.l) })) : [];
    return { due, novos };
  }

  /* ---------- caça: colar lista do Google Maps ou planilha ---------- */
  const normName = s => C.norm(s).replace(/[^a-z0-9]+/g, ' ').trim();
  /* telefone com ou sem DDD (sem DDD, o Hórus usa o DDD da cidade da caça) */
  const PHONE_RE = /(?:\+?55\s*)?(?:\(?\b\d{2}\)?\s*)?\b9?\s?\d{4}[-\s.]?\d{4}\b/;
  const ADDR_RE = /^(rua|r\.|av\.?|avenida|rod\.?|rodovia|travessa|tv\.|alameda|al\.|pra[cç]a|p[cç]a\.?|estrada|est\.|largo|quadra|qd\.?)\s/i;
  const JUNK_RE = /^(\d[.,]\d\s*\(|[0-9.,]+\s*\(\d|aberto|fechado|fecha |abre |abertura|·?\s*(aberto|fechado)|rotas?$|site$|website$|ligar$|salvar$|compartilhar$|avalia|estrelas?|\d+\s*avalia|^\$+|r\$\s*\d|pedir|reservar|menu$|card[aá]pio$)/i;
  /* vírgula fora de aspas vira ponto e vírgula (linear: a regex antiga travava a aba com planilha grande) */
  function virgulas(t){ let out = '', q = false; for(const ch of String(t || '')){ if(ch === '"') q = !q; else if(ch === '\n') q = false; out += ch === ',' && !q ? ';' : ch; } return out; }
  function parseCaca(raw){
    const text = String(raw || '').replace(/\r/g, ''), lines = text.split('\n').map(s => s.trim()), recs = [];
    const filled = lines.filter(Boolean);
    const sep = filled.filter(s => /[;\t|]/.test(s)).length >= Math.max(1, filled.length * 0.6);
    if(sep){
      filled.forEach(s => {
        const p = s.split(/\s*[;\t|]\s*/), tel = p.find(x => PHONE_RE.test(x)) || '';
        if(/^nome$|^empresa$/i.test(p[0] || '')) return;
        const nome = p[0] && !PHONE_RE.test(p[0]) ? p[0] : (p.find(x => x && !PHONE_RE.test(x)) || '');
        const insta = (p.find(x => /^@[A-Za-z0-9_.]{2,30}$|instagram\.com\//i.test(x)) || '').replace(/^@|.*instagram\.com\//i, '').replace(/[/?].*$/, '');
        const rest = p.filter(x => x && x !== nome && x !== tel && !/^@|instagram\.com/i.test(x));
        recs.push({ nome, tel, insta, bairro: rest[0] || '', end: rest.slice(1).join(', ') });
      });
    } else {
      let cur = null; const push = () => { if(cur && cur.nome) recs.push(cur); cur = null; };
      lines.forEach(s => {
        if(!s){ if(cur && (cur.tel || cur.end)) push(); return; }
        const ph = s.match(PHONE_RE);
        if(ph){
          const left = s.replace(ph[0], '').replace(/[·•|,-]+\s*$/, '').trim();
          if(!cur) cur = { nome: '', tel: '', bairro: '', end: '' };
          if(!cur.tel) cur.tel = ph[0]; else { push(); cur = { nome: '', tel: ph[0], bairro: '', end: '' }; }
          if(left && !cur.nome && !JUNK_RE.test(left) && !/·/.test(left)) cur.nome = left.replace(/\s*[-–]\s*$/, '');
          else if(left && /·/.test(left)){ const part = left.split('·').map(x => x.trim()).filter(Boolean); cur.end = cur.end || part[part.length - 1]; cur.cat = cur.cat || part[0]; }
          return;
        }
        if(JUNK_RE.test(s)) return;
        /* linha de endereço logo depois da empresa: é o endereço dela, não empresa nova */
        if(cur && !cur.end && ADDR_RE.test(s)){ cur.end = s; return; }
        if(/·/.test(s)){ if(!cur) return; const part = s.split('·').map(x => x.trim()).filter(Boolean); cur.cat = cur.cat || part[0]; const addr = part.find(x => /\d|rua|av\.?|avenida|r\.|rod/i.test(x) && !JUNK_RE.test(x)); if(addr) cur.end = cur.end || addr; return; }
        if(cur && (cur.tel || cur.end)) push();
        if(!cur) cur = { nome: s, tel: '', bairro: '', end: '' }; else if(!cur.nome) cur.nome = s; else cur.end = cur.end || s;
      });
      push();
    }
    const tels = new Set(), names = new Set();
    H.leads.forEach(l => { [l.wa, l.fixo].forEach(d => { if(d) tels.add(String(d).slice(-8)); }); names.add(normName(shortName(l.nome))); });
    const seen = new Set();
    const pr = cfg().praca;
    const validos = recs.filter(r => r.nome && r.nome.length >= 2); H.cortados = Math.max(0, validos.length - 300);
    return validos.slice(0, 300).map(r => {
      const ph = phoneOf(r.tel, pr.ddd), k8 = ph ? String(ph.wa || ph.fixo).slice(-8) : '', nk = normName(shortName(r.nome));
      const dup = (k8 && tels.has(k8)) || names.has(nk) ? 'já está no Hórus' : seen.has(k8 || nk) ? 'repetida na lista' : '';
      seen.add(k8 || nk);
      const sinais = [!r.insta && 'sem_insta', ph && !ph.wa && ph.fixo && 'so_fixo'].filter(Boolean);
      return Object.assign({}, r, { ph, sinais, cidade: pr.cidade, uf: pr.uf, nicho: guessNicho(`${r.nome} ${r.cat || ''} ${H.assunto}`), dup, on: !dup });
    });
  }
  async function addRows(rows, fonte){
    const base = Date.now().toString(36);
    const payload = rows.map((r, i) => ({ nome: r.nome.trim().slice(0, 120), nicho: r.nicho || '', bairro: (r.bairro || '').trim().slice(0, 80), endereco: (r.end || '').trim().slice(0, 200), tel: r.ph ? r.ph.fmt : '', wa: r.ph ? r.ph.wa : '', fixo: r.ph ? r.ph.fixo : '', insta: (r.insta || '').slice(0, 30), sinais: Array.isArray(r.sinais) ? r.sinais.filter(k => SINAIS[k]).slice(0, 12) : [], cidade: String(r.cidade || cfg().praca.cidade || '').slice(0, 60), uf: UFN[r.uf] ? r.uf : (UFN[cfg().praca.uf] ? cfg().praca.uf : ''), obs: ((r.cat ? `Caça: ${r.cat}` : (H.assunto ? `Caça: ${H.assunto}` : '')) + (r.site ? ` · ${r.site}` : '')).slice(0, 1000), st: 'novo', fonte: r.fonte || fonte || 'caca', lat: r.lat != null ? r.lat : null, lng: r.lng != null ? r.lng : null, ref: `c-${base}${i.toString(36)}`, hist: [{ t: new Date().toISOString(), k: 'cria', v: H.assunto ? `Caça: ${H.assunto}` : 'Caça' }] }));
    for(let i = 0; i < payload.length; i += 200){ await C.api.ins('corre_leads', payload.slice(i, i + 200)); }
    return payload.length;
  }
  function cacaLinks(){
    const pr = cfg().praca, q = H.assunto.trim(), cid = [pr.cidade, pr.uf].filter(Boolean).join(' '), full = q ? `${q} ${cid}` : '';
    return full ? { maps: `https://www.google.com/maps/search/${encodeURIComponent(full)}`, google: `https://www.google.com/search?q=${encodeURIComponent(full + ' whatsapp')}`, insta: `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com ${q} ${cid}`)}` } : null;
  }

  /* ---------- praças (cidades) no radar ---------- */
  const lugarDe = l => l.cidade ? lugarTxt(l.cidade, l.uf) : (() => { const c = cfg(); return c.cidade === 'tua cidade' ? '' : lugarTxt(c.cidade, c.uf); })();
  function pracasNoRadar(){
    const m = new Map();
    H.leads.forEach(l => { const k = lugarDe(l); if(!k) return; const o = m.get(k) || { k, cidade: l.cidade, uf: l.uf, n: 0 }; o.n++; m.set(k, o); });
    return [...m.values()].sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  }
  const variasPracas = () => pracasNoRadar().length > 1;
  /* "· Manaus/AM" nas listas, só quando o radar tem mais de uma cidade */
  const ondeTxt = l => variasPracas() && lugarDe(l) ? ' · ' + lugarDe(l) : '';
  const naPraca = (l, k) => !k || lugarDe(l) === k;
  async function setPraca(pr){
    const c = cfg(), cidade = String(pr.cidade || '').trim().slice(0, 60), uf = UFN[pr.uf] ? pr.uf : '';
    if(!cidade) return;
    let ddd = pr.ddd || '';
    if(!ddd){ try{ ddd = await dddDe(cidade, uf); }catch(e){ ddd = ''; } }
    const nova = { cidade, uf, ddd };
    const igual = (a, b) => C.norm(a.cidade) === C.norm(b.cidade) && a.uf === b.uf;
    const pracas = [nova].concat(c.praca.cidade ? [c.praca] : [], c.pracas).filter((x, i, arr) => x.cidade && arr.findIndex(y => igual(x, y)) === i).slice(0, 8);
    H.auto && (H.auto.b = '');
    await saveCfg({ praca: nova, pracas });
  }

  /* ---------- radar ---------- */
  const Scope = (() => {
    let cv = null, ctx = null, W = 0, raf = 0, t0 = performance.now(), pts = [], hover = null, dpr = 1, labels = [];
    const PER = 4200, RKM = 11, RAD = Math.PI / 180;
    const reduce = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
    function place(list, mode){
      labels = [];
      if(mode === 'mapa'){
        const geo = list.filter(o => o.l.lat != null && o.l.lng != null);
        const c0 = cfg().centro || (() => { const la = geo.map(o => +o.l.lat).sort((a, b) => a - b), ln = geo.map(o => +o.l.lng).sort((a, b) => a - b); return { lat: la[la.length >> 1], lng: ln[ln.length >> 1] }; })();
        pts = geo.map(o => { const dy = (o.l.lat - c0.lat) * 110.57, dx = (o.l.lng - c0.lng) * 111.32 * Math.cos(c0.lat * RAD), dist = Math.hypot(dx, dy), k = Math.min(1, dist / RKM), a = Math.atan2(dy, dx);
          return Object.assign({}, o, { x: Math.cos(a) * k, y: -Math.sin(a) * k, ang: (Math.atan2(-dy, dx) + Math.PI * 2) % (Math.PI * 2), out: dist > RKM }); });
        labels = [['NORTE', 90], ['OESTE', 180], ['SUL', 270], ['LESTE', 0]].map(([t, d]) => ({ t, a: d * RAD }));
        return;
      }
      /* calor: cada fatia é um nicho; quanto mais quente, mais perto do centro */
      const ns = [...new Set(list.map(o => o.l.nicho || ''))];
      const order = cfg().nichos.map(n => n.k).filter(k => ns.includes(k)).concat(ns.filter(k => !cfg().nichos.some(n => n.k === k)));
      const step = Math.PI * 2 / Math.max(1, order.length);
      pts = list.map(o => {
        const i = Math.max(0, order.indexOf(o.l.nicho || '')), j = (C.hash(o.l.id) % 1000) / 1000;
        const a = i * step + step * (0.12 + 0.76 * j), r = Math.max(0.06, Math.min(0.96, (1 - o.h / 100) * 1.02 + ((C.hash(o.l.id + 'r') % 100) / 100 - 0.5) * 0.06));
        return Object.assign({}, o, { x: Math.cos(a) * r, y: Math.sin(a) * r, ang: a, out: false });
      });
      if(order.length > 1) labels = order.map((k, i) => ({ t: (cfg().nichos.find(n => n.k === k) || { n: k || 'sem nicho' }).n.split(/\s+e\s+|\s+/)[0].toUpperCase().slice(0, 12), a: i * step + step / 2, sector: i * step }));
    }
    function size(){
      if(!cv) return; const r = cv.parentElement.getBoundingClientRect(); dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(220, Math.round(Math.min(r.width, 620))); cv.style.width = W + 'px'; cv.style.height = W + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr);
    }
    function draw(now){
      if(!ctx) return; const R = W / 2 - 14, c = W / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, W);
      const bg = ctx.createRadialGradient(c, c, 0, c, c, R + 14); bg.addColorStop(0, '#16110A'); bg.addColorStop(1, '#050506');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(c, c, R + 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,80,.16)'; ctx.lineWidth = 1;
      const rings = H.mode === 'mapa' ? [3, 6, 9].map(k => k / RKM) : [0.40, 0.62];
      rings.forEach(k => { ctx.beginPath(); ctx.arc(c, c, R * k, 0, Math.PI * 2); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,190,80,.40)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,110,.5)'; ctx.font = `600 ${Math.max(9, W / 56)}px "IBM Plex Mono",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if(H.mode === 'mapa') [3, 6, 9].forEach(k => ctx.fillText(`${k} km`, c + 4 + R * k / RKM * Math.cos(-0.35), c - R * k / RKM * Math.sin(-0.35) - 2));
      else { ctx.fillText('QUENTE', c, c - R * 0.40 + 9); ctx.fillText('MORNO', c, c - R * 0.62 + 9); }
      labels.forEach(lb => {
        if(lb.sector != null){ ctx.strokeStyle = 'rgba(255,190,80,.09)'; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(lb.sector) * R, c + Math.sin(lb.sector) * R); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,200,110,.62)';
        const y = H.mode === 'mapa' ? c - Math.sin(lb.a) * (R - 16) : c + Math.sin(lb.a) * (R - 16);
        ctx.fillText(lb.t, c + Math.cos(lb.a) * (R - 16), y);
      });
      const still = reduce(), th = still ? -Math.PI / 4 : (((now - t0) % PER) / PER) * Math.PI * 2;
      if(!still){
        const sw = ctx.createConicGradient ? ctx.createConicGradient(th - Math.PI * 0.5, c, c) : null;
        if(sw){ sw.addColorStop(0, 'rgba(255,170,50,0)'); sw.addColorStop(0.23, 'rgba(255,170,50,0)'); sw.addColorStop(0.25, 'rgba(255,170,50,.20)'); sw.addColorStop(0.2501, 'rgba(255,170,50,0)'); ctx.fillStyle = sw; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,200,110,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(th) * R, c + Math.sin(th) * R); ctx.stroke();
      }
      const pulse = ((now - t0) % 1400) / 1400;
      pts.forEach(p => {
        const x = c + p.x * R, y = c + p.y * R, [r0, g0, b0] = COL[p.temp];
        let glow = 1; if(!still){ const pa = Math.atan2(p.y, p.x); let d = (th - pa) % (Math.PI * 2); if(d < 0) d += Math.PI * 2; glow = Math.exp(-d / 2.3); }
        const a = p.out ? 0.35 : 0.32 + 0.68 * glow, rad = (p.temp === 'hot' ? 4.4 : p.temp === 'warm' ? 3.5 : 2.8) * (W / 520 + 0.4);
        if(p.due && !still){ ctx.strokeStyle = `rgba(${r0},${g0},${b0},${(1 - pulse) * 0.8})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rad + 3 + pulse * 10, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = `rgba(${r0},${g0},${b0},${a})`; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        if(glow > 0.6 && !still){ ctx.fillStyle = `rgba(${r0},${g0},${b0},${(glow - 0.6) * 0.5})`; ctx.beginPath(); ctx.arc(x, y, rad * 2.6, 0, Math.PI * 2); ctx.fill(); }
        if(p.rank){ ctx.fillStyle = '#050506'; ctx.strokeStyle = 'rgba(255,220,150,.95)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + rad + 7, y - rad - 7, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,150,.95)'; ctx.font = '700 10px "IBM Plex Mono",monospace'; ctx.fillText(String(p.rank), x + rad + 7, y - rad - 6.5); }
        if(hover && hover.l.id === p.l.id){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, Math.PI * 2); ctx.stroke(); }
      });
      ctx.fillStyle = 'rgba(255,220,150,.9)'; ctx.beginPath(); ctx.arc(c, c, 3, 0, Math.PI * 2); ctx.fill();
    }
    function loop(now){ raf = 0; if(!cv || !cv.isConnected || document.hidden) return; draw(now); if(!reduce()) raf = requestAnimationFrame(loop); }
    function hit(e){ const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, R = W / 2 - 14, c = W / 2; let best = null, bd = 16; pts.forEach(p => { const d = Math.hypot(c + p.x * R - mx, c + p.y * R - my); if(d < bd){ bd = d; best = p; } }); return best; }
    function mount(el, list, mode){
      cv = el; ctx = cv.getContext('2d'); size(); place(list, mode);
      cv.onpointermove = e => { const h = hit(e); if((h && h.l.id) !== (hover && hover.l.id)){ hover = h; const tip = C.$('hz-tip');
        if(tip){ if(h){ const r = cv.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(r.width - 170, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px'; tip.innerHTML = `<b>${esc(shortName(h.l.nome))}</b><span>${h.h} · ${TEMP[h.temp]}${h.due ? ' · vencido' : ''}</span><span>${esc(nichoOf(h.l).n)}${h.l.bairro ? ' · ' + esc(h.l.bairro) : ''}</span>`; } else tip.hidden = true; }
        cv.style.cursor = h ? 'pointer' : 'default'; if(reduce()) draw(performance.now()); } };
      cv.onpointerleave = () => { hover = null; const tip = C.$('hz-tip'); if(tip) tip.hidden = true; };
      cv.onclick = e => { const h = hit(e); if(h) leadSheet(h.l.id); };
      if(!raf) raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', () => { if(cv && cv.isConnected){ size(); draw(performance.now()); } });
    document.addEventListener('visibilitychange', () => { if(!document.hidden && cv && cv.isConnected && !raf) raf = requestAnimationFrame(loop); });
    return { mount };
  })();

  /* ---------- dados ---------- */
  async function load(){
    H.leads = await C.api.q('corre_leads', { eq: { dono: C.uid() }, order: ['created_at', false], limit: 5000 });
    H.leads.forEach(l => { if(!Array.isArray(l.hist)) l.hist = []; });
    if(C.DEMO && !H.leads.length && !H.seeded){ H.seeded = true; await seedDemo(); return load(); }
    H.by = Object.fromEntries(H.leads.map(l => [l.id, l])); H.loaded = true;
  }
  async function seedDemo(){
    const N = [['Burger do Bairro (exemplo)', 'comida', 'Gleba Palhano', 2], ['Café Rua Quieta (exemplo)', 'cafe', 'Centro', 1], ['Studio Forma (exemplo)', 'academia', 'Higienópolis', 1], ['Clínica Pele Leve (exemplo)', 'estetica', 'Bela Suíça', 3], ['Ótica Visão Norte (exemplo)', 'moda', 'Zona Norte', 1], ['Barbearia Navalha (exemplo)', 'beleza', 'Vila Nova', 0], ['Imóveis Lago (exemplo)', 'imovel', 'Igapó', 3], ['Pet Amigo (exemplo)', 'pet', 'Jardim Bandeirantes', 1], ['Bar do Calçadão (exemplo)', 'eventos', 'Centro', 1], ['Escola Aprender (exemplo)', 'educacao', 'Shangri-lá', 0], ['Pizzaria Forno a Lenha (exemplo)', 'comida', 'Centro', 2], ['Padaria Trigo (exemplo)', 'cafe', 'Vila Brasil', 0], ['Moda Rua (exemplo)', 'moda', 'Centro', 2], ['Auto Center Pista (exemplo)', 'auto', 'Cilo', 1]];
    const sts = ['interesse', 'contato', 'novo', 'link', 'novo', 'contato', 'novo', 'novo', 'contato', 'novo', 'novo', 'perdido', 'novo', 'novo'];
    const t = Date.now();
    const pr = cfg().praca;
    const rows = N.map(([nome, nicho, bairro, pot], i) => ({ nome, nicho, bairro, potencial: pot, cidade: pr.cidade, uf: UFN[pr.uf] ? pr.uf : '', wa: '4390000' + String(1000 + i), tel: '', st: sts[i], fonte: 'exemplo', ref: 'ex-' + i,
      prox: sts[i] === 'contato' ? addDays(i % 2 ? -1 : 0) : sts[i] === 'interesse' ? today() : null, cad: sts[i] === 'contato' ? { ini: addDays(-2), step: 1 } : null,
      hist: sts[i] === 'novo' ? [] : [{ t: new Date(t - (i + 1) * 36e5).toISOString(), k: 'toque', v: 'WhatsApp · D0 · Abordagem' }].concat(sts[i] === 'interesse' ? [{ t: new Date(t - 30 * 36e5).toISOString(), k: 'res', v: 'Respondeu com interesse' }] : []) }));
    try{ await C.api.ins('corre_leads', rows); }catch(e){}
  }

  /* ---------- telas ---------- */
  const EYE = '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M2 20C12 6 52 6 62 20C52 34 12 34 2 20Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="20" r="9" fill="currentColor"/><path d="M32 29v9M24 33l-4 5M40 33l4 5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>';
  function scored(){
    return H.leads.filter(l => !DONE.includes(l.st)).map(l => { const h = heat(l); return { l, h, temp: tempOf(h), due: isDue(l), esf: esfriando(l) }; }).sort((a, b) => b.h - a.h);
  }
  function paint(){
    if(!C.$('hz-root')) return;
    const c = cfg(), sc = scored();
    const pcs = pracasNoRadar(), on = C.$('hz-onde');
    if(on) on.textContent = `radar de clientes · ${c.oferta || 'teu corre'} · ${pcs.length > 1 ? `${pcs.length} cidades no radar` : `em ${lugarTxt(c.praca.cidade, c.praca.uf) || c.cidade}`}`;
    const alvos = sc.filter(o => digits(o.l) && nextMsg(o.l)).slice(0, 5); alvos.forEach((o, i) => o.rank = i + 1);
    const vis = sc.filter(o => H.f === 'todos' || (H.f === 'hot' && o.temp === 'hot') || (H.f === 'due' && o.due) || (H.f === 'frio' && o.esf) || (H.f === 'faro' && faroDe(o.l).length));
    const cnt = { hot: sc.filter(o => o.temp === 'hot').length, warm: sc.filter(o => o.temp === 'warm').length, cold: sc.filter(o => o.temp === 'cold').length, due: sc.filter(o => o.due).length, esf: sc.filter(o => o.esf).length, faro: sc.filter(o => faroDe(o.l).length).length };
    const geo = sc.filter(o => o.l.lat != null).length;
    if(H.mode === 'mapa' && geo < 3) H.mode = 'calor';
    C.$('hz-scope-head').innerHTML = `<div class="hz-chips" role="group" aria-label="Filtrar o radar">${[['todos', 'Tudo', ''], ['hot', 'Quentes', cnt.hot], ['due', 'Vencidos', cnt.due], ['faro', 'Faro', cnt.faro], ['frio', 'Esfriando', cnt.esf]].map(([k, n, x]) => `<button type="button" class="hz-chip" data-act="hz-f" data-k="${k}" aria-pressed="${H.f === k}">${n}${x !== '' ? ` <b>${x}</b>` : ''}</button>`).join('')}</div>
      ${geo >= 3 ? `<div class="hz-chips" role="group" aria-label="Modo do radar">${[['calor', 'Calor'], ['mapa', 'Mapa']].map(([k, n]) => `<button type="button" class="hz-chip" data-act="hz-mode" data-k="${k}" aria-pressed="${H.mode === k}">${n}</button>`).join('')}</div>` : ''}`;
    C.$('hz-legend').innerHTML = `<span class="lg hot"><i></i>${cnt.hot} quentes</span><span class="lg warm"><i></i>${cnt.warm} mornos</span><span class="lg cold"><i></i>${cnt.cold} frios</span><span class="lg due"><i></i>${cnt.due} vencidos</span>${H.mode === 'mapa' && sc.length - geo ? `<span class="lg off">${sc.length - geo} sem posição</span>` : ''}`;
    const rk = Object.fromEntries(alvos.map(o => [o.l.id, o.rank]));
    /* no modo mapa o radar mede distância: mostra uma cidade só (a filtrada ou a praça atual) */
    const pk = H.pf || lugarTxt(c.praca.cidade, c.praca.uf);
    const visR = H.mode === 'mapa' && variasPracas() ? vis.filter(o => naPraca(o.l, pk)) : vis;
    Scope.mount(C.$('hz-cv'), visR.map(o => Object.assign({}, o, { rank: rk[o.l.id] })), H.mode);

    const p = placar(), pct = Math.min(100, Math.round(p.hoje / p.meta * 100)), maxBar = Math.max(p.meta, ...p.bars.map(b => b.n), 1);
    C.$('hz-placar').innerHTML = `<div class="hz-h"><h2>Placar</h2><span class="hz-meta">meta <button type="button" class="hz-mini" data-act="hz-meta" data-k="-1" aria-label="Diminuir a meta">−</button><b>${p.meta}</b><button type="button" class="hz-mini" data-act="hz-meta" data-k="1" aria-label="Aumentar a meta">+</button> toques/dia</span></div>
      <div class="hz-score"><div><b>${p.hoje}</b><small>toques hoje</small></div><div><b>${p.streak}</b><small>${p.streak === 1 ? 'dia na meta' : 'dias seguidos na meta'}</small></div></div>
      <div class="hz-bar" role="img" aria-label="${p.hoje} de ${p.meta} toques hoje"><i style="width:${pct}%"></i></div>
      <div class="hz-week" aria-label="Toques por dia nesta semana">${p.bars.map((b, i) => `<span class="${b.fut ? 'fut' : ''}${b.d === today() ? ' now' : ''}" title="${ddmm(b.d)}: ${b.n} toques"><i style="height:${Math.round(b.n / maxBar * 100)}%"></i><em>${'STQQSSD'[i]}</em></span>`).join('')}</div>
      <p class="hz-wk">semana: ${p.wk.toques} toques · ${p.wk.resp} respostas · ${p.wk.fech} fechados</p>`;

    C.$('hz-alvos').innerHTML = `<div class="hz-h"><h2>Alvos do dia</h2><span>os 5 que mais valem um toque agora</span></div>
      ${alvos.length ? `<ol class="hz-list">${alvos.map(o => { const m = nextMsg(o.l); return `<li class="hz-row">
        <span class="hz-sc ${o.temp}" title="Calor ${o.h} de 100">${o.h}</span>
        <button type="button" class="hz-name" data-act="hz-open" data-id="${o.l.id}"><b>${o.rank}. ${esc(shortName(o.l.nome))}</b><span>${esc(nichoOf(o.l).n)}${o.l.bairro ? ' · ' + esc(o.l.bairro) : ''}${esc(ondeTxt(o.l))}</span><span class="hz-why">${reasons(o.l).map(esc).join(' · ')}</span></button>
        ${`<a class="hz-btn pri" href="${esc(waUrl(o.l, compose(o.l, m.k)))}" target="_blank" rel="noopener" data-act="hz-fire" data-id="${o.l.id}" title="${esc(m.n)}${o.l.wa ? '' : ' · WhatsApp do fixo'}">${esc(m.n.replace(/^D\d · /, ''))}</a>${o.l.wa ? '' : `<button type="button" class="hz-btn" data-act="hz-call" data-id="${o.l.id}">Liguei</button>`}`}
      </li>`; }).join('')}</ol>` : '<p class="hz-muted">Nenhuma empresa aberta com telefone. Caça aqui embaixo pra encher o radar.</p>'}`;

    const fl = fila(), items = fl.due.map(o => Object.assign(o, { tipo: 'venceu' })).concat(fl.novos.map(o => Object.assign(o, { tipo: 'novo' })));
    C.$('hz-fila').innerHTML = `<div class="hz-h"><h2>Fila de disparo</h2><span>${items.length ? `${items.length} ${items.length === 1 ? 'mensagem pronta' : 'mensagens prontas'}` : 'fila vazia'}</span></div>
      <p class="hz-help">Cadência: <b>D0</b> abordagem, <b>D2</b> retomar, <b>D5</b> mostra, <b>D9</b> último toque. Quem responde sai da cadência e volta pra mensagem da etapa.</p>
      ${items.length ? `<ol class="hz-list">${items.slice(0, 40).map(o => { const m = nextMsg(o.l), txt = compose(o.l, m.k); return `<li class="hz-row q">
        <span class="hz-step${m.cad ? '' : ' etapa'}">${esc(m.n)}</span>
        <button type="button" class="hz-name" data-act="hz-open" data-id="${o.l.id}"><b>${esc(shortName(o.l.nome))}</b><span>${o.tipo === 'venceu' ? `<em class="late">${o.l.prox < today() ? `venceu ${ddmm(o.l.prox)}` : 'hoje'}</em> ` : '<em>novo</em> '}${esc(nichoOf(o.l).n)}${esc(ondeTxt(o.l))}</span><span class="hz-prev">${esc(txt.replace(/\s+/g, ' ').slice(0, 120))}…</span></button>
        <div class="hz-acts">${`<a class="hz-btn pri" href="${esc(waUrl(o.l, txt))}" target="_blank" rel="noopener" data-act="hz-fire" data-id="${o.l.id}"${o.l.wa ? '' : ' title="WhatsApp do fixo"'}>Enviar</a>${o.l.wa ? '' : `<span class="hz-tel">${esc(fmtTel(o.l.fixo))}</span><button type="button" class="hz-btn" data-act="hz-call" data-id="${o.l.id}">Liguei</button>`}`}<button type="button" class="hz-btn ghost" data-act="hz-skip" data-id="${o.l.id}">Pular</button></div>
      </li>`; }).join('')}</ol>` : `<p class="hz-muted">${p.hoje >= p.meta ? 'Meta do dia batida. Amanhã o Hórus monta a fila de novo.' : 'Nada vencido e nenhum novo com telefone. Caça mais empresas aqui embaixo.'}</p>`}`;
    paintCaca(); paintBase(); if(T()) T().paint(); if(C.horusMax) C.horusMax.paint();
  }
  /* praça: UF + cidade (lista do IBGE), as últimas praças e o horário de lá */
  function pracaHTML(){
    const c = cfg(), pr = c.praca, uf = H.puf != null ? H.puf : pr.uf, cid = H.pcid != null ? H.pcid : pr.cidade;
    const hl = pr.uf && tzDe(pr.uf) !== 'America/Sao_Paulo' ? (() => { const x = horaEm(pr.uf); return ` · lá são ${x.h}h${String(x.m).padStart(2, '0')}`; })() : '';
    const rec = c.pracas.filter(x => !(C.norm(x.cidade) === C.norm(pr.cidade) && x.uf === pr.uf));
    return `<div class="hz-praca">
      <div class="hz-praca-f"><div class="fld"><label class="hz-lbl" for="hz-puf">Estado</label><select class="hz-in" id="hz-puf"><option value="">UF</option>${UFS.map(([k, n]) => `<option value="${k}"${uf === k ? ' selected' : ''}>${k} · ${esc(n)}</option>`).join('')}</select></div>
        <div class="fld"><label class="hz-lbl" for="hz-pcid">Cidade</label><input class="hz-in" id="hz-pcid" list="hz-pcid-l" value="${esc(cid)}" placeholder="${uf ? 'Digita a cidade' : 'Escolhe o estado antes'}" autocomplete="off"><datalist id="hz-pcid-l"></datalist></div>
        <button type="button" class="hz-btn" data-act="hz-praca">${ico('pin')} Caçar nessa cidade</button></div>
      <p class="hz-praca-st">Caçando em <b>${esc(lugarTxt(pr.cidade, pr.uf) || 'nenhuma cidade ainda')}</b>${pr.ddd ? ` · DDD ${esc(pr.ddd)}` : ''}${hl}</p>
      ${rec.length ? `<div class="hz-chips" role="group" aria-label="Últimas cidades">${rec.map((x, i) => `<button type="button" class="hz-chip" data-act="hz-praca-r" data-i="${c.pracas.indexOf(x)}">${esc(lugarTxt(x.cidade, x.uf))}</button>`).join('')}</div>` : ''}
    </div>`;
  }
  async function encheCidades(){
    const sel = C.$('hz-puf'), dl = C.$('hz-pcid-l'); if(!sel || !dl) return;
    const uf = sel.value; if(!uf){ dl.innerHTML = ''; return; }
    try{ const ls = await municipios(uf); if(C.$('hz-puf') && C.$('hz-puf').value === uf) C.$('hz-pcid-l').innerHTML = ls.map(n => `<option value="${esc(n)}">`).join(''); }catch(e){}
  }
  function paintCaca(){
    const L = cacaLinks(), rows = H.rows, c = cfg();
    const vivo = T() && T().cacaVivo && H.cmodo === 'vivo', auto = T() && !vivo && H.cmodo !== 'colar';
    C.$('hz-caca').innerHTML = `<div class="hz-h"><h2>Caça</h2><span>${vivo ? 'porta a porta, onde você tá agora' : `${auto ? 'o Hórus procura sozinho' : 'qualquer assunto'}, em ${esc(lugarTxt(c.praca.cidade, c.praca.uf) || c.cidade)}`}</span></div>
      ${T() ? `<div class="hz-chips hz-cmodo" role="group" aria-label="Jeito de caçar"><button type="button" class="hz-chip" data-act="hz-cmodo" data-k="auto" aria-pressed="${auto}">Automática</button>${T().cacaVivo ? `<button type="button" class="hz-chip" data-act="hz-cmodo" data-k="vivo" aria-pressed="${vivo}">${ico('pin')} Ao vivo</button>` : ''}<button type="button" class="hz-chip" data-act="hz-cmodo" data-k="colar" aria-pressed="${!auto && !vivo}">Colar lista</button></div>` : ''}
      ${vivo ? '' : pracaHTML()}
      ${vivo ? T().cacaVivo() : auto ? T().cacaAuto() : `<div class="hz-q"><input class="hz-in" id="hz-assunto" placeholder="O que caçar? Ex.: hamburgueria, clínica de estética, academia" value="${esc(H.assunto)}" autocomplete="off" aria-label="Assunto da caça"></div>
      <div class="hz-go" id="hz-go">${L ? `<a class="hz-btn" href="${esc(L.maps)}" target="_blank" rel="noopener">Google Maps</a><a class="hz-btn" href="${esc(L.google)}" target="_blank" rel="noopener">Google</a><a class="hz-btn" href="${esc(L.insta)}" target="_blank" rel="noopener">Instagram</a>` : '<span class="hz-muted">Escreve o assunto pra abrir a busca no Google Maps, no Google e no Instagram.</span>'}</div>
      <label class="hz-lbl" for="hz-paste">Cola aqui o que achou</label>
      <textarea class="hz-in hz-paste" id="hz-paste" rows="5" placeholder="Copie os resultados do Google Maps (nome, endereço, telefone) ou uma planilha (nome; telefone; bairro; @instagram) e cole aqui.">${esc(H.paste)}</textarea>
      <div class="hz-row-acts"><button type="button" class="hz-btn" data-act="hz-ler">Ler lista</button>${rows ? '<button type="button" class="hz-btn ghost" data-act="hz-limpar">Limpar</button>' : ''}</div>`}
      ${rows && !vivo ? (rows.length ? `<div class="hz-prevlist"><table><thead><tr><th></th><th>Empresa</th><th>Telefone</th><th>Nicho</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.dup ? 'dup' : ''}">
        <td><input type="checkbox" data-chg="hz-row" data-i="${i}" ${r.on ? 'checked' : ''} aria-label="Incluir ${esc(r.nome)}"></td>
        <td><b>${esc(r.nome)}</b>${r.end || r.bairro || (r.cidade && C.norm(r.cidade) !== C.norm(c.praca.cidade)) ? `<small>${esc([r.end, r.bairro, r.cidade && C.norm(r.cidade) !== C.norm(c.praca.cidade) ? r.cidade : ''].filter(Boolean).join(' · '))}</small>` : ''}${r.lat != null ? '<small class="hz-pin">no mapa</small>' : ''}${(r.sinais || []).filter(k => c.faro.includes(k)).length ? `<span class="hz-sinais">${r.sinais.filter(k => c.faro.includes(k)).map(k => `<span class="hz-sinal on">${esc(SINAIS[k].n)}</span>`).join('')}</span>` : ''}${r.dup ? `<small class="warn">${r.dup}</small>` : ''}</td>
        <td class="mono">${r.ph ? esc(r.ph.fmt) : '<span class="hz-muted">sem</span>'}</td>
        <td><select class="hz-in sm" data-chg="hz-rowseg" data-i="${i}" aria-label="Nicho de ${esc(r.nome)}">${c.nichos.map(n => `<option value="${esc(n.k)}"${n.k === r.nicho ? ' selected' : ''}>${esc(n.n)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
        <div class="hz-row-acts"><button type="button" class="hz-btn pri" data-act="hz-add">Pôr ${rows.filter(r => r.on).length} no radar</button><span class="hz-muted">${rows.filter(r => r.dup).length ? `${rows.filter(r => r.dup).length} repetidas ficaram de fora` : ''}</span></div>`
        : '<p class="hz-muted">Não achei empresas nesse texto. Cola com o nome e o telefone de cada uma.</p>') : ''}`;
    encheCidades();
  }
  function paintBase(){
    const el = C.$('hz-base'); if(!el) return;
    const q = C.norm(H.q);
    let list = H.leads.map(l => ({ l, h: heat(l) }));
    if(H.st === 'abertos') list = list.filter(o => !DONE.includes(o.l.st)); else if(H.st) list = list.filter(o => o.l.st === H.st);
    if(H.pf) list = list.filter(o => naPraca(o.l, H.pf));
    if(q) list = list.filter(o => C.norm([o.l.nome, o.l.bairro, o.l.cidade, nichoOf(o.l).n, o.l.insta].join(' ')).includes(q));
    list.sort((a, b) => b.h - a.h || String(a.l.nome).localeCompare(String(b.l.nome)));
    const cnt = st => H.leads.filter(l => l.st === st).length;
    el.innerHTML = `<div class="hz-h"><h2>Base</h2><span>${H.leads.length} ${H.leads.length === 1 ? 'empresa' : 'empresas'} no radar</span></div>
      <div class="hz-base-tools"><input class="hz-in" id="hz-q" placeholder="Procurar por nome, bairro, cidade, nicho" value="${esc(H.q)}" aria-label="Procurar na base">
        ${variasPracas() ? `<select class="hz-in sm" data-chg="hz-pf" aria-label="Cidade"><option value="">Todas as cidades</option>${pracasNoRadar().map(p => `<option value="${esc(p.k)}"${H.pf === p.k ? ' selected' : ''}>${esc(p.k)} (${p.n})</option>`).join('')}</select>` : ''}
        <select class="hz-in sm" data-chg="hz-st" aria-label="Etapa"><option value="abertos"${H.st === 'abertos' ? ' selected' : ''}>Em aberto</option><option value=""${!H.st ? ' selected' : ''}>Todas</option>${STAGES.map(([k, n]) => `<option value="${k}"${H.st === k ? ' selected' : ''}>${n} (${cnt(k)})</option>`).join('')}</select></div>
      ${list.length ? `<ul class="hz-base">${list.slice(0, H.more).map(o => `<li><button type="button" data-act="hz-open" data-id="${o.l.id}"><span class="hz-sc ${o.h ? tempOf(o.h) : 'off'}">${o.h || '·'}</span><span class="nm"><b>${esc(o.l.nome)}</b><small>${esc(nichoOf(o.l).n)}${o.l.bairro ? ' · ' + esc(o.l.bairro) : ''}${esc(ondeTxt(o.l))}</small></span><span class="stg st-${o.l.st}">${SN[o.l.st] || o.l.st}</span><span class="px">${o.l.prox && !DONE.includes(o.l.st) ? ddmm(o.l.prox) : ''}</span></button></li>`).join('')}</ul>${list.length > H.more ? `<button type="button" class="hz-btn ghost wide" data-act="hz-mais">Mostrar mais ${Math.min(60, list.length - H.more)}</button>` : ''}` : '<p class="hz-muted">Nada por aqui com esse filtro.</p>'}`;
    const qi = C.$('hz-q'); if(qi) qi.oninput = () => { H.q = qi.value; clearTimeout(H.qt); H.qt = setTimeout(() => { const pos = qi.selectionStart; paintBase(); const n = C.$('hz-q'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} } }, 250); };
  }

  C.views.horus = async function(app){
    await privCarrega();
    const c = cfg();
    app.innerHTML = C.header('horus') + `<main class="wrap wide"><section class="hz" id="hz-root" aria-label="Hórus">
      <header class="hz-top"><div class="hz-mark"><span class="hz-eye">${EYE}</span><div><h1>Hórus</h1><p id="hz-onde">radar de clientes · ${esc(c.oferta || 'teu corre')}</p></div></div>
        <div class="hz-tools"><button type="button" class="hz-btn pri" data-act="hz-novo">${ico('plus')} Lead</button>${C.horusMax ? C.horusMax.botoes() : ''}<button type="button" class="hz-btn" data-act="hz-import">${ico('up')} Importar</button><button type="button" class="hz-btn" data-act="hz-cfg">${ico('edit')} Ajustar</button></div></header>
      <div id="hz-body"><p class="hz-muted">Ligando o radar…</p></div>
    </section></main>`;
    try{ await load(); }catch(e){ C.$('hz-body').innerHTML = `<p class="hz-muted">${esc(C.errMsg(e, 'Não deu pra abrir o Hórus agora.'))}</p>`; return; }
    if(!C.$('hz-body')) return;
    if(!H.leads.length){
      C.$('hz-body').innerHTML = `<div class="hz-empty"><h2>O radar tá vazio. Bora caçar.</h2><p>O Hórus encontra, aquece e lembra. Coloca empresas aqui e ele monta teus alvos do dia, a fila de mensagens e o placar.</p>
        <div class="hz-row-acts">${C.horusMax ? `<button type="button" class="hz-btn pri" data-act="mx-montar">${ico('star')} Me diz o que você vende</button>` : ''}<button type="button" class="hz-btn${C.horusMax ? '' : ' pri'}" data-act="hz-ir-caca">Caçar empresas</button><button type="button" class="hz-btn" data-act="hz-import">Importar lista ou backup do Hórus</button><button type="button" class="hz-btn" data-act="hz-cfg">Dizer o que eu vendo</button></div></div>
        <section class="hz-card" id="hz-caca"></section>`;
      paintCaca(); return;
    }
    C.$('hz-body').innerHTML = `<div class="hz-grid">
        <section class="hz-card hz-scope"><div class="hz-scope-head" id="hz-scope-head"></div><div class="hz-cvwrap"><canvas id="hz-cv" aria-label="Radar: cada ponto é uma empresa; mais perto do centro, mais quente"></canvas><div class="hz-tip" id="hz-tip" hidden></div></div><div class="hz-legend" id="hz-legend"></div></section>
        <div class="hz-col"><section class="hz-card" id="hz-alvos"></section><section class="hz-card" id="hz-placar"></section></div>
      </div>
      <section class="hz-card" id="hz-fila"></section>
      ${C.horusMax ? '<section class="hz-card" id="hz-orc"></section>' : ''}
      ${T() ? '<section class="hz-card" id="hz-mapa"></section>' : ''}
      <section class="hz-card" id="hz-caca"></section>
      ${T() ? '<section class="hz-card" id="hz-vende"></section>' : ''}
      <section class="hz-card" id="hz-base"></section>`;
    paint();
  };

  /* ---------- folha do lead ---------- */
  function leadSheet(id){
    const l = H.by[id]; if(!l) return;
    const c = cfg(), h = heat(l), m = nextMsg(l) || { k: defaultMsg(l), n: TN[defaultMsg(l)] };
    const panel = C.sheet(`<div class="form hz-lead"><div class="sheet-head"><h2>${esc(shortName(l.nome))}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="hz-lead-top"><span class="hz-sc ${h ? tempOf(h) : 'off'}">${h || '·'}</span><span>${h ? `${TEMP[tempOf(h)]} · ${reasons(l).map(esc).join(' · ') || 'sem sinal ainda'}` : esc(SN[l.st])}</span></div>
      ${sinaisDe(l).length ? `<div class="hz-faro" aria-label="Sinais da empresa"><span class="mono">Faro</span>${sinaisDe(l).map(k => `<span class="hz-sinal${c.faro.includes(k) ? ' on' : ''}">${esc(SINAIS[k].n)}</span>`).join('')}</div>` : ''}
      <div class="hz-fotos" id="hl-fotos" hidden></div>
      <div class="hz-stages" role="group" aria-label="Etapa">${STAGES.map(([k, n]) => `<button type="button" class="hz-chip light" data-act="hz-st" data-id="${l.id}" data-k="${k}" aria-pressed="${l.st === k}">${n}</button>`).join('')}</div>
      <div class="row2">
        <div class="fld"><label for="hl-wa">WhatsApp</label><input class="inp" id="hl-wa" inputmode="tel" value="${esc(fmtTel(l.wa))}" placeholder="(DDD) 9 9999-9999"></div>
        <div class="fld"><label for="hl-fixo">Fixo</label><input class="inp" id="hl-fixo" inputmode="tel" value="${esc(fmtTel(l.fixo))}" placeholder="(DDD) 3333-3333"></div>
      </div>
      <div class="row2">
        <div class="fld"><label for="hl-ig">Instagram</label><div class="at"><input class="inp" id="hl-ig" value="${esc(l.insta || '')}" autocapitalize="none" spellcheck="false" placeholder="perfil"></div></div>
        <div class="fld"><label for="hl-ni">Nicho</label><select class="inp" id="hl-ni">${c.nichos.map(n => `<option value="${esc(n.k)}"${n.k === l.nicho ? ' selected' : ''}>${esc(n.n)}</option>`).join('')}${l.nicho && !c.nichos.some(n => n.k === l.nicho) ? `<option value="${esc(l.nicho)}" selected>${esc(l.nicho)}</option>` : ''}</select></div>
      </div>
      <div class="row2">
        <div class="fld"><label for="hl-cid">Cidade${l.uf && tzDe(l.uf) !== tzDe(c.uf || 'SP') ? ` <small>lá são ${(x => `${x.h}h${String(x.m).padStart(2, '0')}`)(horaEm(l.uf))}</small>` : ''}</label><div class="seguir-row"><input class="inp" id="hl-cid" maxlength="60" value="${esc(l.cidade || '')}" placeholder="${esc(c.praca.cidade || 'Cidade')}"><select class="inp sm" id="hl-uf" aria-label="Estado"><option value="">UF</option>${UFS.map(([k]) => `<option${l.uf === k ? ' selected' : ''}>${k}</option>`).join('')}</select></div></div>
        <div class="fld"><label for="hl-bai">Bairro</label><input class="inp" id="hl-bai" maxlength="80" value="${esc(l.bairro || '')}"></div>
      </div>
      <div class="row2">
        <div class="fld"><label for="hl-px">Próximo contato</label><input class="inp" id="hl-px" type="date" value="${esc(l.prox || '')}"></div>
        <div class="fld"><label for="hl-pt">Potencial</label><select class="inp" id="hl-pt">${['Normal', 'Bom', 'Alto', 'Baleia'].map((n, i) => `<option value="${i}"${(+l.potencial || 0) === i ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <div class="fld"><label for="hl-ob">Anotações</label><textarea class="inp" id="hl-ob" maxlength="1000" placeholder="Quem decide, o que doeu, o que prometeu…">${esc(l.obs || '')}</textarea></div>
      <div class="acts"><button type="button" class="btn sm pri" data-act="hz-salvar" data-id="${l.id}">Salvar dados</button>${C.negocio ? `<button type="button" class="btn sm" data-act="ng-novo" data-lead="${l.id}">${ico('recibo')} Orçamento</button>` : ''}${l.bairro || l.endereco ? `<a class="btn sm" href="https://www.google.com/maps/search/${encodeURIComponent([l.nome, l.endereco, l.bairro, l.cidade || c.praca.cidade || c.cidade, l.uf].filter(Boolean).join(', '))}" target="_blank" rel="noopener">${ico('ext')} Mapa</a>` : ''}${T() ? T().leadBtns(l) : ''}${l.insta ? `<a class="btn sm" href="https://www.instagram.com/${encodeURIComponent(l.insta)}/" target="_blank" rel="noopener">${ico('ig')} Instagram</a>` : ''}${l.fixo || l.wa ? `<a class="btn sm" href="tel:+55${esc(l.fixo || l.wa)}">Ligar</a>` : ''}</div>
      <div class="hz-msg"><div class="ch-row"><b>Mensagem</b>${T() ? `<button type="button" class="btn sm" id="hl-ia">${ico('star')} Escrever com IA</button>` : ''}<select class="inp sm" id="hl-tpl" aria-label="Qual mensagem">${TPL.map(([k, n]) => `<option value="${k}"${k === m.k ? ' selected' : ''}>${n}${k === m.k && nextMsg(l) ? ' (a vez dele)' : ''}</option>`).join('')}</select></div>
        <textarea class="inp" id="hl-txt" rows="7">${esc(compose(l, m.k))}</textarea>${T() ? '<p class="hint" id="hl-ia-st" aria-live="polite"></p>' : ''}
        <div class="acts"><a class="btn pri" id="hl-send" href="${esc(waUrl(l, compose(l, m.k)))}" target="_blank" rel="noopener" data-act="hz-fire" data-id="${l.id}">${ico('wa')} Enviar no WhatsApp</a><button type="button" class="btn" data-act="hz-copiar" data-id="${l.id}">Copiar e marcar enviado</button></div>
        ${l.wa ? '' : `<p class="hint">${l.fixo ? `Sem celular: o botão abre o WhatsApp do fixo ${esc(fmtTel(l.fixo))} (muita empresa usa WhatsApp Business nele). Se não for WhatsApp, o próprio WhatsApp avisa.` : 'Sem número: o WhatsApp abre pra você escolher o contato.'}</p>`}</div>
      <div class="hz-res"><b>Resultado</b><div class="acts"><button type="button" class="btn sm" data-act="hz-res" data-id="${l.id}" data-k="sim">Respondeu</button><button type="button" class="btn sm" data-act="hz-res" data-id="${l.id}" data-k="nao">Sem resposta</button><button type="button" class="btn sm pri" data-act="hz-st" data-id="${l.id}" data-k="fechado">Fechou</button></div></div>
      ${T() ? T().respHTML(l) : ''}
      ${(l.hist || []).length ? `<div class="hz-hist"><b>Histórico</b><ul>${l.hist.slice(0, 14).map(x => `<li><span>${x.t ? ddmm(localDay(x.t)) : ''}</span>${esc(x.v || x.k)}</li>`).join('')}</ul></div>` : ''}
      <div class="acts"><button type="button" class="btn sm ghost" data-act="hz-del" data-id="${l.id}">${ico('trash')} Tirar do radar</button></div>
    </div>`);
    const tpl = C.$('hl-tpl'), txt = C.$('hl-txt'), send = C.$('hl-send');
    const sync = () => { if(send) send.href = waUrl(l, txt.value); };
    tpl.addEventListener('change', () => { txt.value = compose(l, tpl.value); delete H.ia[l.id]; sync(); });
    txt.addEventListener('input', sync);
    if(T()) T().onLead(l, panel);
    fotosDoLead(l);
    return panel;
  }
  /* as fotos de referência que o cliente mandou no pedido de orçamento (só a dona vê) */
  async function fotosDoLead(l){
    let fs = []; try{ fs = await C.api.q('corre_lead_fotos', { select: 'id,img,created_at', eq: { lead_id: l.id }, order: ['created_at', true], limit: 6 }); }catch(e){ return; }
    const box = C.$('hl-fotos'); if(!box || !fs.length) return;
    box.hidden = false;
    box.innerHTML = `<span class="mono">Referência que ${esc(shortName(l.nome))} mandou</span><div class="hz-fotos-l">${fs.filter(f => /^data:image\/jpeg;base64,[A-Za-z0-9+\/]+={0,2}$/.test(f.img)).map((f, i) => `<figure><button type="button" class="hz-ft" data-ft="${esc(f.id)}" aria-label="Ver a foto ${i + 1} maior"><img src="${esc(f.img)}" alt="Referência ${i + 1}"></button><button type="button" class="linklike" data-ft-del="${esc(f.id)}">apagar</button></figure>`).join('')}</div><p class="fine">Só você vê. Apaga quando não precisar mais.</p>`;
    box.addEventListener('click', async e => {
      const v = e.target.closest('[data-ft]'); if(v){ v.closest('figure').classList.toggle('grande'); return; }
      const d = e.target.closest('[data-ft-del]'); if(!d) return;
      if(d.dataset.armed !== '1'){ d.dataset.armed = '1'; d.textContent = 'apagar mesmo?'; return; }
      try{ await C.api.del('corre_lead_fotos', { id: d.dataset.ftDel }); d.closest('figure').remove(); if(!box.querySelector('figure')) box.hidden = true; }catch(err){ C.toast(C.errMsg(err)); }
    });
  }
  function readSheet(l){
    l.cidade = String(C.$('hl-cid').value || '').trim().slice(0, 60); l.uf = UFN[C.$('hl-uf').value] ? C.$('hl-uf').value : '';
    l.bairro = String(C.$('hl-bai').value || '').trim().slice(0, 80);
    const wa = phoneOf(C.$('hl-wa').value), fx = String(C.$('hl-fixo').value || '').replace(/\D/g, '');
    l.wa = wa && wa.wa ? wa.wa : (String(C.$('hl-wa').value).replace(/\D/g, '').length >= 10 ? String(C.$('hl-wa').value).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : '');
    l.fixo = fx.replace(/^55(?=\d{10}$)/, '').slice(0, 13);
    l.insta = String(C.$('hl-ig').value || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').slice(0, 30);
    l.nicho = C.$('hl-ni').value; l.prox = C.$('hl-px').value || null; l.potencial = +C.$('hl-pt').value || 0; l.obs = C.$('hl-ob').value.slice(0, 1000);
    if(!/^[A-Za-z0-9_.]{0,30}$/.test(l.insta)) l.insta = '';
  }
  async function setStage(l, st){
    if(l.st === st) return;
    l.st = st; logH(l, 'st', `Etapa: ${SN[st]}`);
    if(DONE.includes(st)) l.prox = null;
    if(st === 'interesse' && !l.prox) l.prox = addDays(1);
    if(await save(l, ['st', 'prox', 'hist'])){
      if(st === 'fechado') fechou(l); else { C.toast(`${shortName(l.nome)}: ${SN[st]}.`); leadSheet(l.id); }
      paint();
    }
  }
  /* fechou: a marca entra no portfólio e a grana dela passa a contar na Grana */
  function fechou(l){
    const nome = shortName(l.nome);
    C.sheet(`<div class="form hz-won"><div class="sheet-head"><h2>Fechou com ${esc(nome)}!</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p>Lança a venda: ela entra em "A receber" com a data do pagamento, e quando o dinheiro cair vira entrada na Grana e conta na tua meta.</p>
      <div class="acts">${C.negocio ? `<button type="button" class="btn pri" data-act="ng-novo" data-lead="${l.id}" data-st="fechado">${ico('recibo')} Lançar a venda</button>` : ''}<button type="button" class="btn" data-act="hz-portfolio" data-id="${l.id}">Pôr no Portfólio</button></div></div>`);
  }

  /* ---------- ajustar ---------- */
  function cfgSheet(){
    const c = cfg();
    let nichos = c.nichos.map(n => Object.assign({}, n));
    const nichoHTML = (n, i) => `<details class="hz-ni"${n._open ? ' open' : ''}><summary><b>${esc(n.n || 'Nicho novo')}</b><span class="hz-sc ${n.prio || 'warm'}">${PRIO[n.prio] || 'Morno'}</span></summary>
      <div class="row2"><div class="fld"><label>Nome</label><input class="inp" data-ni="${i}" data-f="n" maxlength="40" value="${esc(n.n)}"></div><div class="fld"><label>Prioridade</label><select class="inp" data-ni="${i}" data-f="prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}"${n.prio === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div></div>
      <div class="fld"><label>A pergunta que dói</label><textarea class="inp" data-ni="${i}" data-f="hook" maxlength="300" rows="2">${esc(n.hook || '')}</textarea></div>
      <div class="fld"><label>O que você resolve</label><textarea class="inp" data-ni="${i}" data-f="valor" maxlength="300" rows="2">${esc(n.valor || '')}</textarea></div>
      <div class="fld"><label>Gancho de uma linha</label><input class="inp" data-ni="${i}" data-f="gancho" maxlength="160" value="${esc(n.gancho || '')}"></div>
      <div class="fld"><label>Palavras que identificam (pra caça)</label><input class="inp" data-ni="${i}" data-f="re" maxlength="300" value="${esc(n.re || '')}" placeholder="hamburgu|burger|lanchonete"></div>
      <button type="button" class="btn sm ghost" data-ni-del="${i}">${ico('trash')} Tirar nicho</button></details>`;
    const panel = C.sheet(`<form class="form" id="hz-cf"><div class="sheet-head"><h2>Ajustar o Hórus</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${C.horusMax ? `<div class="hz-mx-cta"><span>Vende outra coisa? Diz numa frase e o Hórus monta nichos, faro e mensagens.</span><button type="button" class="btn sm pri" data-act="mx-montar">${ico('star')} Montar com IA</button></div>` : ''}
      <div class="row2"><div class="fld"><label for="hc-eu">Teu nome na mensagem</label><input class="inp" id="hc-eu" maxlength="40" value="${esc(c.eu)}"></div><div class="fld"><label for="hc-cid">Tua cidade <small>({minha_cidade})</small></label><div class="seguir-row"><input class="inp" id="hc-cid" maxlength="40" value="${esc(c.cidade)}"><select class="inp sm" id="hc-uf" aria-label="Teu estado"><option value="">UF</option>${UFS.map(([k]) => `<option${c.uf === k ? ' selected' : ''}>${k}</option>`).join('')}</select></div></div></div>
      <div class="fld"><label for="hc-of">O que você vende (entra no "Aqui é {eu}, …")</label><input class="inp" id="hc-of" maxlength="80" value="${esc(c.oferta)}" placeholder="social media pra restaurante"></div>
      <div class="row2"><div class="fld"><label for="hc-ln">Link (portfólio, proposta ou cadastro)</label><input class="inp" id="hc-ln" maxlength="300" value="${esc(c.link)}" placeholder="https://" inputmode="url"></div><div class="fld"><label for="hc-mt">Meta de toques por dia</label><input class="inp" id="hc-mt" type="number" min="1" max="80" value="${c.meta}"></div></div>
      <div class="fld"><label for="hc-pre">Começar de um modelo</label><div class="seguir-row"><select class="inp" id="hc-pre">${Object.entries(PRE).map(([k, p]) => `<option value="${k}"${(C.st.me.horus || {}).preset === k ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select><button type="button" class="btn sm" id="hc-apply">Usar modelo</button></div><span class="hint">Troca nichos e mensagens pelos do modelo. Teus leads não mudam.</span></div>
      <h3 class="hz-sub">Faro</h3><p class="hint">Que sinais mostram que a empresa precisa do que você vende? Eles esquentam o lead e entram na mensagem pelo {sinal}.</p>
      <div class="hz-chips hc-faro" role="group" aria-label="Sinais que contam">${Object.entries(SINAIS).map(([k, x]) => `<label class="hz-chip light"><input type="checkbox" value="${k}"${c.faro.includes(k) ? ' checked' : ''}> ${esc(x.n)}</label>`).join('')}</div>
      <h3 class="hz-sub">Nichos</h3><div id="hc-nichos">${nichos.map(nichoHTML).join('')}</div><button type="button" class="btn sm" id="hc-addn">${ico('plus')} Nicho</button>
      <h3 class="hz-sub">Mensagens</h3><p class="hint">Use {oi} {eu} {empresa} {nicho} {hook} {valor} {gancho} {oferta} {link} {cidade} {minha_cidade} {sinal}. O Hórus troca por cada empresa: {cidade} é a cidade da empresa, {minha_cidade} é a tua, e o {oi} segue o horário de lá.</p>
      ${TPL.map(([k, n, d]) => `<div class="fld"><label for="ht-${k}">${n} <small>${d}</small></label><textarea class="inp" id="ht-${k}" rows="4" maxlength="1200">${esc(c.tpl[k] || '')}</textarea></div>`).join('')}
      <div class="acts sticky"><button type="submit" class="btn pri">Salvar ajustes</button></div></form>`);
    const box = C.$('hc-nichos');
    const syncN = () => box.querySelectorAll('[data-ni]').forEach(el => { const n = nichos[+el.dataset.ni]; if(n) n[el.dataset.f] = el.value; });
    const redraw = () => { syncN(); box.innerHTML = nichos.map(nichoHTML).join(''); };
    box.addEventListener('click', e => { const d = e.target.closest('[data-ni-del]'); if(d){ syncN(); nichos.splice(+d.dataset.niDel, 1); box.innerHTML = nichos.map(nichoHTML).join(''); } });
    C.$('hc-addn').addEventListener('click', () => { syncN(); nichos.forEach(n => delete n._open); nichos.push({ k: 'n' + Date.now().toString(36), n: '', prio: 'warm', hook: '', valor: '', gancho: '', re: '', _open: true }); box.innerHTML = nichos.map(nichoHTML).join(''); const last = box.querySelector('details:last-child input'); if(last) last.focus(); });
    C.$('hc-apply').addEventListener('click', () => {
      const p = PRE[C.$('hc-pre').value]; if(!p) return;
      nichos = p.nichos.map(n => Object.assign({}, n)); box.innerHTML = nichos.map(nichoHTML).join('');
      TPL.forEach(([k]) => { C.$('ht-' + k).value = p.tpl[k] || ''; });
      if(!C.$('hc-of').value.trim() || Object.values(PRE).some(x => x.oferta === C.$('hc-of').value.trim())) C.$('hc-of').value = p.oferta || '';
      if(p.link && !C.$('hc-ln').value.trim()) C.$('hc-ln').value = p.link;
      C.toast(`Modelo ${p.nome} carregado. Salva pra valer.`);
    });
    C.$('hz-cf').addEventListener('submit', async e => {
      e.preventDefault(); syncN();
      const clean = nichos.filter(n => String(n.n || '').trim()).map(({ _open, ...n }) => Object.assign(n, { n: String(n.n).trim().slice(0, 40) })).slice(0, 30);
      if(!clean.length){ C.toast('Deixa pelo menos um nicho.'); return; }
      const link = C.$('hc-ln').value.trim();
      const tpl = {}; TPL.forEach(([k]) => tpl[k] = C.$('ht-' + k).value.slice(0, 1200));
      try{
        await saveCfg({ preset: C.$('hc-pre').value, eu: C.$('hc-eu').value.trim().slice(0, 40), cidade: C.$('hc-cid').value.trim().slice(0, 40), uf: C.$('hc-uf').value, oferta: C.$('hc-of').value.trim().slice(0, 80), link: link && !/^https?:\/\//i.test(link) ? 'https://' + link : link, meta: Math.max(1, Math.min(80, +C.$('hc-mt').value || 15)), nichos: clean, tpl, faro: [...document.querySelectorAll('.hc-faro input:checked')].map(i => i.value) });
        C.closeSheet(); C.toast('Hórus ajustado.'); C.views.horus(C.$('app'));
      }catch(err){ C.toast(C.errMsg(err)); }
    });
    return panel;
  }

  /* ---------- importar: backup do Hórus (KivoTrack) ou planilha ---------- */
  function fromBackup(j){
    const cat = (j.catalog && j.catalog.leads) || [], state = j.state || {}, out = [];
    const toLead = (id, b, s) => {
      const tel = Array.isArray(b.tel) ? b.tel[0] : (b.tel || '');
      const ph = phoneOf(b.wa || '') || phoneOf(tel) || phoneOf(b.fixo || '');
      const st = STAGES.some(x => x[0] === s.st) ? s.st : 'novo';
      return { ref: 'h-' + String(id).slice(0, 70), nome: String(b.nome || id).slice(0, 120), nicho: String(b.seg || '').slice(0, 40), bairro: String(b.bairro || '').slice(0, 80), endereco: String(b.end || '').slice(0, 200), tel: String(tel || '').slice(0, 40),
        wa: (b.wa ? String(b.wa).replace(/\D/g, '') : (ph && ph.wa) || '').slice(-11), fixo: (b.fixo ? String(b.fixo).replace(/\D/g, '') : (ph && ph.fixo) || '').slice(-11), insta: '',
        obs: [b.obs, s.motivo ? `Motivo: ${s.motivo}` : '', s.obs].filter(Boolean).join(' · ').slice(0, 1000), st, prox: s.prox || null, cad: s.cad || null, potencial: 0,
        lat: b.lat != null ? +b.lat : null, lng: b.lng != null ? +b.lng : null, fonte: 'horus', hist: (Array.isArray(s.hist) ? s.hist : []).slice(0, 40) };
    };
    cat.forEach(b => out.push(toLead(b.id, b, state[b.id] || {})));
    Object.entries(state).forEach(([id, s]) => { if(s && s.base) out.push(toLead(id, s.base, s)); });
    return { leads: out.filter(l => l.nome), cfg: j.cfg || {} };
  }
  function importSheet(){
    C.sheet(`<div class="form"><div class="sheet-head"><h2>Importar pro Hórus</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Aceita o <b>backup do Hórus</b> (o arquivo .json do "Exportar backup", com leads, etapas e histórico) ou uma <b>planilha CSV</b> com nome e telefone.</p>
      <div class="acts"><button type="button" class="btn pri" id="hi-file">${ico('up')} Escolher arquivo</button></div>
      <div class="fld"><label for="hi-txt">Ou cola o conteúdo aqui</label><textarea class="inp" id="hi-txt" rows="5" placeholder='{"catalog":…}  ou  nome;telefone;bairro'></textarea></div>
      <div class="acts"><button type="button" class="btn" id="hi-ler">Ler</button></div><div id="hi-prev"></div></div>`);
    let parsed = null;
    const show = txt => {
      txt = String(txt || '').replace(/^﻿/, '').trim(); parsed = null;
      if(!txt){ C.$('hi-prev').innerHTML = ''; return; }
      if(/^[{[]/.test(txt)){
        try{ const j = JSON.parse(txt); parsed = Object.assign({ tipo: 'backup' }, fromBackup(j)); }catch(e){ C.$('hi-prev').innerHTML = '<p class="note">Esse JSON não abriu. Confere se copiou o arquivo inteiro.</p>'; return; }
      } else { const rows = parseCaca(virgulas(txt)).filter(r => !r.dup); parsed = { tipo: 'lista', rows }; }
      const n = parsed.tipo === 'backup' ? parsed.leads.length : parsed.rows.length;
      const kivo = parsed.tipo === 'backup' && parsed.leads.some(l => (PRE.kivotrack || { nichos: [] }).nichos.some(x => x.k === l.nicho));
      C.$('hi-prev').innerHTML = n ? `<p><b>${n}</b> ${n === 1 ? 'empresa' : 'empresas'}${parsed.tipo === 'backup' ? ` · ${parsed.leads.filter(l => l.st !== 'novo').length} já trabalhadas · ${parsed.leads.reduce((s, l) => s + l.hist.length, 0)} registros de histórico` : ''}.</p>${parsed.tipo !== 'backup' && H.cortados ? `<p class="note">A planilha tinha mais ${H.cortados}: entram as primeiras 300 agora. Importa o resto numa segunda leva.</p>` : ''}
        ${kivo ? '<label class="switch"><input type="checkbox" id="hi-kivo" checked><span class="sw"></span><span><b>Usar o modelo KivoTrack</b><small>Nichos (transportadoras, autoescolas…) e mensagens do rastreador.</small></span></label>' : ''}
        <div class="acts"><button type="button" class="btn pri" id="hi-ok">Importar ${n}</button></div><p class="fine">Importar de novo o mesmo backup atualiza as etapas, sem duplicar.</p>` : '<p class="note">Não achei empresas aí.</p>';
      const ok = C.$('hi-ok'); if(ok) ok.addEventListener('click', run);
    };
    async function run(ev){
      const b = ev.target; b.disabled = true; b.textContent = 'Importando…';
      try{
        let n = 0;
        if(parsed.tipo === 'backup'){
          for(let i = 0; i < parsed.leads.length; i += 200){ const r = await C.api.upsert('corre_leads', parsed.leads.slice(i, i + 200), 'dono,ref', false); n += r.length; }
          const k = C.$('hi-kivo'), cf = parsed.cfg || {}, patch = {};
          if(k && k.checked){ const p = PRE.kivotrack; patch.preset = 'kivotrack'; patch.nichos = p.nichos; patch.tpl = p.tpl; patch.oferta = p.oferta; }
          if(cf.ref) patch.link = cf.ref; if(cf.nome) patch.eu = cf.nome; if(+cf.metaToques) patch.meta = +cf.metaToques;
          if(Object.keys(patch).length) await saveCfg(patch);
        } else n = await addRows(parsed.rows, 'lista');
        C.closeSheet(); C.toast(`${n} ${n === 1 ? 'empresa entrou' : 'empresas entraram'} no radar.`, 3200); C.views.horus(C.$('app'));
      }catch(e){ C.toast(C.errMsg(e, 'Não deu pra importar.')); b.disabled = false; b.textContent = 'Importar'; }
    }
    C.$('hi-file').addEventListener('click', async () => { const f = await C.pickFile('.json,.csv,.txt,application/json,text/csv'); if(!f) return; if(f.size > 8e6){ C.toast('Arquivo grande demais.'); return; } const t = await f.text(); C.$('hi-txt').value = t.length > 200000 ? '' : t; show(t); });
    C.$('hi-ler').addEventListener('click', () => show(C.$('hi-txt').value));
  }
  function novoSheet(){
    const c = cfg();
    C.sheet(`<form class="form" id="hn-f"><div class="sheet-head"><h2>Novo lead</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fld"><label for="hn-n">Empresa</label><input class="inp" id="hn-n" maxlength="120" required autofocus></div>
      <div class="row2"><div class="fld"><label for="hn-w">WhatsApp ou telefone</label><input class="inp" id="hn-w" inputmode="tel" placeholder="(DDD) 9 9999-9999"></div><div class="fld"><label for="hn-i">Instagram</label><div class="at"><input class="inp" id="hn-i" autocapitalize="none" spellcheck="false" placeholder="perfil"></div></div></div>
      <div class="row2"><div class="fld"><label for="hn-c">Nicho</label><select class="inp" id="hn-c">${c.nichos.map(n => `<option value="${esc(n.k)}">${esc(n.n)}</option>`).join('')}</select></div><div class="fld"><label for="hn-b">Bairro</label><input class="inp" id="hn-b" maxlength="80"></div></div>
      <div class="acts"><button type="submit" class="btn pri">Pôr no radar</button></div></form>`);
    C.$('hn-n').addEventListener('input', () => { const g = guessNicho(C.$('hn-n').value); if(g) C.$('hn-c').value = g; });
    C.$('hn-f').addEventListener('submit', async e => {
      e.preventDefault(); const nome = C.$('hn-n').value.trim(); if(!nome){ C.toast('Coloca o nome da empresa.'); return; }
      const pr = cfg().praca, ph = phoneOf(C.$('hn-w').value, pr.ddd), ig = C.$('hn-i').value.trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.]/g, '').slice(0, 30);
      try{ await C.api.ins('corre_leads', { nome, nicho: C.$('hn-c').value, bairro: C.$('hn-b').value.trim(), tel: ph ? ph.fmt : '', wa: ph ? ph.wa : '', fixo: ph ? ph.fixo : '', insta: ig, cidade: pr.cidade.slice(0, 60), uf: UFN[pr.uf] ? pr.uf : '', st: 'novo', fonte: 'manual', hist: [{ t: new Date().toISOString(), k: 'cria', v: 'Na mão' }] }); C.closeSheet(); C.toast('No radar.'); C.views.horus(C.$('app')); }
      catch(err){ C.toast(C.errMsg(err)); }
    });
  }

  /* ---------- ações ---------- */
  Object.assign(C.acts, {
    'hz-f': el => { H.f = el.dataset.k; paint(); },
    'hz-mode': el => { H.mode = el.dataset.k; paint(); },
    'hz-meta': async el => { const m = Math.max(1, Math.min(80, cfg().meta + Number(el.dataset.k))); try{ await saveCfg({ meta: m }); }catch(e){ C.toast(C.errMsg(e)); } paint(); },
    'hz-open': el => leadSheet(el.dataset.id),
    'hz-pf': el => { H.pf = el.value; H.more = 60; paintBase(); },
    'hz-praca': async el => {
      const uf = (C.$('hz-puf') || {}).value || '', cidade = String((C.$('hz-pcid') || {}).value || '').trim();
      if(!uf){ C.toast('Escolhe o estado.'); return; }
      if(!cidade){ C.toast('Escreve a cidade.'); C.$('hz-pcid').focus(); return; }
      el.disabled = true;
      let nome = cidade;
      try{ const ls = await municipios(uf); const achou = ls.find(n => C.norm(n) === C.norm(cidade)); if(ls.length && !achou){ C.toast(`Não achei "${cidade}" em ${UFN[uf]}. Escolhe da lista.`); el.disabled = false; return; } if(achou) nome = achou; }catch(e){}
      try{ await setPraca({ cidade: nome, uf }); H.puf = null; H.pcid = null; H.rows = null; if(H.auto) H.auto.st = ''; C.toast(`Caçando em ${nome}/${uf}.`); if(H.leads.length) paint(); else paintCaca(); }
      catch(e){ C.toast(C.errMsg(e)); el.disabled = false; }
    },
    'hz-praca-r': async el => { const x = cfg().pracas[+el.dataset.i]; if(!x) return; try{ await setPraca(x); H.puf = null; H.pcid = null; H.rows = null; if(H.auto) H.auto.st = ''; if(H.leads.length) paint(); else paintCaca(); }catch(e){ C.toast(C.errMsg(e)); } },
    'hz-fire': el => { fire(el.dataset.id, 'WhatsApp'); if(el.id === 'hl-send') C.closeSheet(); },
    'hz-call': el => fire(el.dataset.id, 'Ligação'),
    'hz-skip': el => { H.skip[el.dataset.id] = true; paint(); },
    'hz-copiar': el => { const t = C.$('hl-txt'); if(t) C.copy(t.value, 'Mensagem copiada.'); fire(el.dataset.id, 'Copiada'); C.closeSheet(); },
    'hz-st': el => { const l = H.by[el.dataset.id]; if(l) setStage(l, el.dataset.k); },
    'hz-res': async el => {
      const l = H.by[el.dataset.id]; if(!l) return;
      if(el.dataset.k === 'sim'){ logH(l, 'res', 'Respondeu'); if(l.st === 'novo') l.st = 'contato'; l.prox = addDays(1); C.toast('Respondeu: saiu da cadência. Próximo passo amanhã.'); }
      else { logH(l, 'res', 'Sem resposta'); C.toast('Anotado. A cadência segue.'); }
      if(await save(l, ['st', 'prox', 'hist'])){ leadSheet(l.id); paint(); }
    },
    'hz-salvar': async el => { const l = H.by[el.dataset.id]; if(!l) return; readSheet(l); if(await save(l, ['wa', 'fixo', 'insta', 'nicho', 'prox', 'potencial', 'obs', 'cidade', 'uf', 'bairro'])){ C.toast('Lead salvo.'); leadSheet(l.id); paint(); } },
    'hz-del': async el => {
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Toca de novo pra tirar'; return; }
      try{ await C.api.del('corre_leads', { id: el.dataset.id }); H.leads = H.leads.filter(l => l.id !== el.dataset.id); delete H.by[el.dataset.id]; C.closeSheet(); C.toast('Saiu do radar.'); paint(); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'hz-portfolio': async el => {
      const l = H.by[el.dataset.id]; if(!l) return;
      try{ await C.api.ins('corre_portfolio', { marca: shortName(l.nome).slice(0, 60), segmento: (nichoOf(l).n || '').slice(0, 60), papel: (cfg().oferta || '').slice(0, 80), desde: String(new Date().getFullYear()), publico: true, ordem: Date.now() % 1e6 }); C.closeSheet(); C.toast(`${shortName(l.nome)} tá no teu Portfólio.`); }
      catch(e){ C.toast(C.errMsg(e)); }
    },
    'hz-cmodo': el => { H.cmodo = el.dataset.k; H.rows = null; paintCaca(); },
    'hz-ler': () => { H.paste = C.$('hz-paste').value; H.rows = parseCaca(H.paste); paintCaca(); if(H.cortados) C.toast(`Entraram as primeiras 300 empresas. Faltaram ${H.cortados}: cola o resto numa segunda leva.`, 5200); },
    'hz-limpar': () => { H.rows = null; H.paste = ''; paintCaca(); },
    'hz-add': async el => {
      const rows = (H.rows || []).filter(r => r.on); if(!rows.length){ C.toast('Marca pelo menos uma empresa.'); return; }
      el.disabled = true;
      try{ const n = await addRows(rows, 'caca'); H.rows = null; H.paste = ''; C.toast(`${n} ${n === 1 ? 'empresa entrou' : 'empresas entraram'} no radar.`); C.views.horus(C.$('app')); }
      catch(e){ C.toast(C.errMsg(e)); el.disabled = false; }
    },
    'hz-row': el => { if(H.rows){ H.rows[+el.dataset.i].on = el.checked; const b = document.querySelector('[data-act="hz-add"]'); if(b) b.textContent = `Pôr ${H.rows.filter(r => r.on).length} no radar`; } },
    'hz-rowseg': el => { if(H.rows) H.rows[+el.dataset.i].nicho = el.value; },
    'hz-mais': () => { H.more += 60; paintBase(); },
    'hz-cfg': () => cfgSheet(),
    'hz-import': () => importSheet(),
    'hz-novo': () => novoSheet(),
    'hz-ir-caca': () => { const i = C.$('hz-assunto'); if(i){ i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus(); } }
  });
  /* o select da base usa data-chg="hz-st" com valor; o botão de etapa usa data-act="hz-st" */
  const stAct = C.acts['hz-st'];
  C.acts['hz-st'] = (el, e) => { if(el.tagName === 'SELECT'){ H.st = el.value; H.more = 60; paintBase(); return; } return stAct(el, e); };
  document.addEventListener('input', e => {
    if(e.target.id === 'hz-assunto'){ H.assunto = e.target.value; clearTimeout(H.at); H.at = setTimeout(() => { const L = cacaLinks(), box = C.$('hz-go'); if(box) box.innerHTML = L ? `<a class="hz-btn" href="${esc(L.maps)}" target="_blank" rel="noopener">Google Maps</a><a class="hz-btn" href="${esc(L.google)}" target="_blank" rel="noopener">Google</a><a class="hz-btn" href="${esc(L.insta)}" target="_blank" rel="noopener">Instagram</a>` : '<span class="hz-muted">Escreve o assunto pra abrir a busca no Google Maps, no Google e no Instagram.</span>'; }, 250); }
    if(e.target.id === 'hz-paste') H.paste = e.target.value;
  });

  /* card do início */
  C.home.push({ k: 'horus', o: 0, async html(){
    /* desligado no perfil: não aparece no Início */
    if(C.ferr && !C.ferr('horus')) return '';
    try{ await load(); }catch(e){ return ''; }
    const sc = scored(), p = placar(), alvos = sc.filter(o => digits(o.l) && nextMsg(o.l)).slice(0, 3);
    return `<a class="hcard horus-mini" href="#/horus">
      <div class="hc-top"><span class="hc-name">${EYE}Hórus</span><span class="mono">radar de clientes</span></div>
      ${H.leads.length ? `<div class="hz-mini-nums"><div><b>${p.hoje}<small>/${p.meta}</small></b><span>toques hoje</span></div><div><b>${sc.filter(o => o.temp === 'hot').length}</b><span>quentes</span></div><div><b>${sc.filter(o => o.due).length}</b><span>vencidos</span></div></div>
        ${alvos.length ? `<ol class="mini-list">${alvos.map(o => `<li><b>${esc(shortName(o.l.nome))}</b><small>${esc(reasons(o.l).join(' · ') || nichoOf(o.l).n)}</small></li>`).join('')}</ol>` : ''}` : '<p class="note">Caça empresas e o Hórus monta teus alvos do dia, a fila de mensagens e o placar.</p>'}
      <span class="hc-go">${H.leads.length ? 'Abrir o radar' : 'Começar a caçar'} ${ico('next')}</span>
      <span class="hz-mini-radar" aria-hidden="true"><i style="left:44%;top:40%"></i><i style="left:64%;top:58%"></i><i style="left:30%;top:66%"></i></span>
    </a>`;
  } });
  /* praça: escolher o estado enche a lista de cidades sem redesenhar a caça */
  document.addEventListener('change', e => {
    if(e.target.id === 'hz-puf'){ H.puf = e.target.value; const i = C.$('hz-pcid'); if(i){ i.placeholder = H.puf ? 'Digita a cidade' : 'Escolhe o estado antes'; if(H.puf) i.focus(); } encheCidades(); }
  });
  document.addEventListener('input', e => { if(e.target.id === 'hz-pcid') H.pcid = e.target.value; });
  C.horus = { parseCaca, fromBackup, heat, compose, phoneOf,
    /* o que o horus-turbo.js usa por dentro */
    _: { H, cfg, saveCfg, save, logH, paint, paintCaca, load, shortName, nichoOf, tempOf, heat, digits, waUrl, fmtTel, phoneOf, STAGES, SN, DONE, OPEN, TN, TEMP, guessNicho, normName, addRows, today, addDays, localDay, leadSheet, scored, nextMsg, compose, isDue, responded, reasons, placar,
      SINAIS, sinaisDe, faroDe, faroPadrao, pediuLink, escolheuMural, fila, municipios, ondeTxt, cadStep,
      UFS, UFN, tzDe, horaEm, oiEm, lugarTxt, lugarDe, parseLugar, pracasNoRadar, variasPracas, naPraca, setPraca, dddDe } };
})();
