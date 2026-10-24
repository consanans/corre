/* CORRE · O CADERNINHO (v4.19, o planner)
   O Thales: "vamos adicionar um planner tipo todoist para organizar tudo dentro do app". Escolheu o nome, "tudo num lugar
   só" e o aviso no celular na hora. O que o Todoist não tem: o dia do Caderninho junta as tuas tarefas com o que o Corre
   já sabe (o post do Studio que sai hoje, o cliente do Hórus pra retornar, a cobrança das Vendas que vence). Esses vêm
   lidos na hora, cada um leva pra ferramenta dele e não se marca aqui (quem resolve é a ferramenta).
   As tarefas (corre_caderno, delta-v419.sql, só a dona vê): título, nota, lista, dia e hora, prioridade, repetir e
   subtarefas. O jeito de anotar é uma frase só: "mandar orçamento amanhã 15h #Trabalho !1" (o Caderninho entende o dia,
   a hora, a lista e a prioridade, e mostra embaixo o que entendeu antes de guardar). Tarefa que repete, quando é feita,
   pula pro próximo dia dela (como o Todoist). Com hora, o celular avisa na hora (o mesmo relógio da hora de postar). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;
  /* v4.30: a Semana (os 7 dias em colunas, arrastando de um pro outro) entra depois do Hoje */
  const ABAS = [['hoje', 'Hoje'], ['semana', 'Semana'], ['prox', 'Próximos'], ['solta', 'Algum dia']];
  const K_ABA = 'corre-caderno-aba', K_LISTA = 'corre-caderno-lista', K_FEITAS = 'corre-caderno-feitas';
  const CD = { uid: '', t: [], ok: false, falta: false, erro: null, corre: [], em: 0, aba: 'hoje', lista: '', ind: null, sem: 0, pulei: new Set() };
  const ls = { get: k => { try{ return localStorage.getItem(k); }catch(e){ return null; } }, set: (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} } };
  { const a = ls.get(K_ABA); if(ABAS.some(x => x[0] === a)) CD.aba = a; CD.lista = ls.get(K_LISTA) || ''; }

  /* ---------- as datas (tudo no dia de Brasília, em "AAAA-MM-DD") ---------- */
  const hoje = () => C.hojeBR();
  const soma = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const semana = iso => new Date(iso + 'T12:00:00Z').getUTCDay();
  const entre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const agoraHM = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(/^24/, '00');
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  /* "hoje", "amanhã", "ontem", "sex 24/10" */
  function diaTxt(iso){
    const n = entre(hoje(), iso);
    if(n === 0) return 'hoje'; if(n === 1) return 'amanhã'; if(n === -1) return 'ontem';
    return `${DIAS_C[semana(iso)]} ${ddmm(iso)}`;
  }
  /* "15h", "15h30" */
  const horaTxt = h => { if(!h) return ''; const [a, b] = h.split(':'); return `${Number(a)}h${b === '00' ? '' : b}`; };
  const REPETE = { '': 'Não repete', dia: 'Todo dia', util: 'Todo dia útil', semana: 'Toda semana', mes: 'Todo mês' };
  /* v4.20 (o Thales: "tem uma tarefa minha que é a cada 56 dias"): o "a cada N" multiplica o dia, a semana ou o mês
     (corre_caderno.cada, delta-v420.sql; 1 = o de sempre) */
  const UNID = { dia: ['dia', 'dias'], semana: ['semana', 'semanas'], mes: ['mês', 'meses'] };
  const cadaDe = t => Math.max(1, Math.min(999, Number(t && t.cada) || 1));
  /* v4.20: os avisos de antes (em minutos; os mesmos que o banco aceita) */
  const ANTES = [[120, '2h antes'], [60, '1h antes'], [1440, '1 dia antes'], [2880, '2 dias antes'], [7200, '5 dias antes'], [10080, '1 semana antes']];
  const ANTES_OK = [15, 30, 60, 120, 180, 1440, 2880, 4320, 7200, 10080, 20160];
  const antesTxt = m => (ANTES.find(x => x[0] === m) || [0, m >= 1440 ? `${m / 1440} dias antes` : m >= 60 ? `${m / 60}h antes` : `${m} min antes`])[1];
  /* v4.21: o endereço vira o Google Maps (busca e rota), e os arquivos moram na pasta privada (C.api.anexo) */
  const mapsBusca = e => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e);
  const mapsRota = e => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(e);
  const ANEXO_MAX = 20 * 1024 * 1024;
  const tam = b => b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  const anexosDe = t => Array.isArray(t && t.anexos) ? t.anexos : [];
  /* v4.25 (o Thales: "o caderninho hoje marca 0 de 2 mas eu fiz uma missão diária já, eu gostaria que ele contasse todas
     ao total"): a que repete, feita, pula pro próximo dia e sumia da conta. Agora o dia em que foi feita fica guardado
     (corre_caderno.feitas, delta-v425.sql, os últimos 400) e ela entra no "feitas hoje"; a diária mostra a sequência.
     Banco sem a coluna: os dias ficam no aparelho (e sobem junto quando a coluna chegar) */
  const K_REP = 'corre-caderno-rep', K_VOLTA = 'corre-caderno-volta';
  const lsJ = k => { try{ return JSON.parse(ls.get(k) || '{}') || {}; }catch(e){ return {}; } };
  const lsJSet = (k, id, v) => { const o = lsJ(k); if(v == null) delete o[id]; else o[id] = v; ls.set(k, JSON.stringify(o)); };
  const feitasDe = t => t ? [...new Set((Array.isArray(t.feitas) ? t.feitas : []).concat(lsJ(K_REP)[t.id] || []))].sort() : [];
  const diaria = t => t.repete === 'util' || (t.repete === 'dia' && cadaDe(t) === 1);
  /* a sequência da diária (e da de dia útil): os dias seguidos até hoje, ou até ontem se hoje ainda não foi */
  function seguidas(t){
    if(!diaria(t)) return 0;
    const S = new Set(feitasDe(t)), util = t.repete === 'util';
    const volta = x => { let y = soma(x, -1); if(util) while(semana(y) === 0 || semana(y) === 6) y = soma(y, -1); return y; };
    let d = hoje(); if(util) while(semana(d) === 0 || semana(d) === 6) d = soma(d, -1);
    if(!S.has(d)) d = volta(d);
    let n = 0; while(S.has(d) && n < 400){ n++; d = volta(d); }
    return n;
  }
  const repTxt = (rep, cada) => { cada = Math.max(1, Number(cada) || 1); return cada > 1 && UNID[rep] ? `A cada ${cada} ${UNID[rep][1]}` : REPETE[rep] || ''; };
  /* o próximo dia de uma tarefa que repete: anda a partir do dia dela até passar de hoje (a de ontem, feita hoje, volta
     amanhã, não ontem de novo) */
  function proximo(dia, rep, cada){
    const hj = hoje(), k = rep === 'util' ? 1 : Math.max(1, Math.min(999, Number(cada) || 1)); let d = dia || hj, i = 0;
    const passo = x => {
      if(rep === 'dia') return soma(x, k);
      if(rep === 'util'){ let y = soma(x, 1); while(semana(y) === 0 || semana(y) === 6) y = soma(y, 1); return y; }
      if(rep === 'semana') return soma(x, 7 * k);
      /* todo mês: o mesmo dia no mês seguinte (o 31 cai no último dia do mês curto) */
      const [a, m, dd] = x.split('-').map(Number), alvo = Number((dia || hj).slice(8, 10)) || dd;
      const mm = m - 1 + k, na = a + Math.floor(mm / 12), nm = mm % 12 + 1;
      const ult = new Date(Date.UTC(na, nm, 0)).getUTCDate();
      return `${na}-${String(nm).padStart(2, '0')}-${String(Math.min(alvo, ult)).padStart(2, '0')}`;
    };
    do { d = passo(d); i++; } while(d <= hj && i < 800);
    return d;
  }

  /* ---------- o anotar rápido: "mandar orçamento amanhã 15h #Trabalho !1" ----------
     Procura numa cópia sem acento e em minúscula (do mesmo tamanho, letra por letra), então as posições servem pro texto
     de verdade: o que foi entendido sai do título e vira dia, hora, lista, prioridade e repetir */
  const SEM = s => s.split('').map(ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '') || ch).join('').toLowerCase();
  const NDIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  const ATE = '(?=$|[\\s,.;!?])';
  function entende(txt, base){
    const s = String(txt || ''), n = SEM(s), hj = hoje(), o = { dia: null, hora: null, prio: null, lista: null, repete: '', cada: 1, antes: [] }, tira = [];
    const acha = (re, f) => { const r = new RegExp(re, 'g'); let m; while((m = r.exec(n))){ const ini = m.index + (m[0].length - m[0].trimStart().length); if(f(m, ini) !== false) tira.push([ini, m.index + m[0].length]); } };
    const livre = (a, b) => !tira.some(([x, y]) => a < y && b > x);
    const proxSem = w => { let d = hj; while(semana(d) !== w) d = soma(d, 1); return d; };
    /* prioridade: !1 a !4, ou p1 a p4 */
    acha(`(?:^|\\s)(?:!|p)([1-4])${ATE}`, m => { o.prio = Number(m[1]); });
    /* lista: #Trabalho (do texto de verdade, com acento) */
    { const r = /(?:^|\s)#([\p{L}\p{N}_-]{1,40})/gu; let m; while((m = r.exec(s))){ const ini = m.index + (m[0].length - m[0].trimStart().length); o.lista = m[1]; tira.push([ini, m.index + m[0].length]); } }
    /* repetir */
    /* "avisa 1 dia antes", "lembra 2h antes" (dá pra pôr mais de um: "avisa 1 dia antes e 1h antes") */
    acha(`(?:^|\\s)(?:(?:me )?(?:avisa|lembra|aviso|avisar|lembrar)(?: tambem)? )?(?:e )?(\\d{1,2}) ?(h|horas?|min|minutos?|dias?|semanas?) antes${ATE}`, m => {
      const n = Number(m[1]), u = m[2], mins = /^h/.test(u) ? n * 60 : /^min/.test(u) ? n : /^d/.test(u) ? n * 1440 : n * 10080;
      if(!ANTES_OK.includes(mins)) return false; if(!o.antes.includes(mins)) o.antes.push(mins);
    });
    /* "a cada 56 dias", "de 15 em 15 dias", "a cada 2 semanas", "a cada 3 meses", "quinzenal" */
    const UN = u => /^dia/.test(u) ? 'dia' : /^sem/.test(u) ? 'semana' : 'mes';
    acha(`(?:^|\\s)(?:a )?cada (\\d{1,3}) (dias?|semanas?|mes|meses)${ATE}`, m => { const n = Number(m[1]); if(!n) return false; o.repete = UN(m[2]); o.cada = n; });
    acha(`(?:^|\\s)de (\\d{1,3}) em \\1 (dias?|semanas?|mes|meses)${ATE}`, m => { const n = Number(m[1]); if(!n) return false; o.repete = UN(m[2]); o.cada = n; });
    acha(`(?:^|\\s)(?:quinzenal(?:mente)?|a cada quinze dias)${ATE}`, () => { o.repete = 'dia'; o.cada = 15; });
    acha(`(?:^|\\s)(?:todo dia util|todos os dias uteis|dia util|dias uteis)${ATE}`, () => { o.repete = 'util'; });
    acha(`(?:^|\\s)(?:todo dia|todos os dias|diariamente)${ATE}`, (m, i) => { if(!livre(i, i + m[0].length)) return false; o.repete = 'dia'; });
    acha(`(?:^|\\s)(?:toda semana|semanalmente)${ATE}`, () => { o.repete = 'semana'; });
    acha(`(?:^|\\s)(?:todo mes|mensalmente)${ATE}`, () => { o.repete = 'mes'; });
    acha(`(?:^|\\s)(?:toda|todo|todas as|todos os) (domingo|segunda|terca|quarta|quinta|sexta|sabado)s?(?:-feira)?s?${ATE}`, m => { o.repete = 'semana'; o.dia = proxSem(NDIA[m[1]]); });
    /* o dia */
    const poeDia = d => { if(!o.dia) o.dia = d; };
    acha(`(?:^|\\s)depois de amanha${ATE}`, () => poeDia(soma(hj, 2)));
    acha(`(?:^|\\s)amanha${ATE}`, (m, i) => { if(!livre(i, i + 6)) return false; poeDia(soma(hj, 1)); });
    acha(`(?:^|\\s)hoje${ATE}`, () => poeDia(hj));
    acha(`(?:^|\\s)(?:semana que vem|proxima semana)${ATE}`, () => { let d = soma(hj, 1); while(semana(d) !== 1) d = soma(d, 1); poeDia(d); });
    acha(`(?:^|\\s)daqui a (\\d{1,3}) dias?${ATE}`, m => poeDia(soma(hj, Number(m[1]))));
    acha(`(?:^|\\s)(?:(?:na|no|nesta|neste|essa|esse|proxima|proximo) )?(domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)(?:-feira)?${ATE}`, (m, i) => { if(!livre(i, i + m[0].trim().length)) return false; poeDia(proxSem(NDIA[m[1]])); });
    acha(`(?:^|\\s)(?:dia )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${ATE}`, m => {
      const dd = Number(m[1]), mm = Number(m[2]); if(dd < 1 || dd > 31 || mm < 1 || mm > 12) return false;
      let a = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : Number(hj.slice(0, 4));
      let iso = `${a}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      if(!m[3] && iso < hj){ a++; iso = `${a}${iso.slice(4)}`; }
      if(isNaN(Date.parse(iso + 'T12:00:00Z')) || new Date(iso + 'T12:00:00Z').getUTCDate() !== dd) return false;
      poeDia(iso);
    });
    acha(`(?:^|\\s)dia (\\d{1,2})${ATE}`, (m, i) => {
      if(!livre(i, i + m[0].trim().length)) return false;
      const dd = Number(m[1]); if(dd < 1 || dd > 31) return false;
      let [a, mm] = hj.split('-').map(Number); if(dd < Number(hj.slice(8, 10))){ mm++; if(mm > 12){ mm = 1; a++; } }
      const ult = new Date(Date.UTC(a, mm, 0)).getUTCDate(); if(dd > ult) return false;
      poeDia(`${a}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
    });
    /* a hora: 15h, 15h30, 15:30, às 9, meio-dia, meia-noite */
    const poeHora = (h, mi) => { if(o.hora || h > 23 || mi > 59) return false; o.hora = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; };
    acha(`(?:^|\\s)(?:as |a )?(\\d{1,2})(?:h(\\d{2})?|:(\\d{2}))(?:min)?${ATE}`, (m, i) => { if(!livre(i, i + m[0].trim().length)) return false; return poeHora(Number(m[1]), Number(m[2] || m[3] || 0)); });
    acha(`(?:^|\\s)as (\\d{1,2})${ATE}`, (m, i) => { if(!livre(i, i + m[0].trim().length)) return false; return poeHora(Number(m[1]), 0); });
    acha(`(?:^|\\s)(?:ao |as )?meio[- ]dia${ATE}`, () => poeHora(12, 0));
    acha(`(?:^|\\s)(?:a )?meia[- ]noite${ATE}`, () => poeHora(0, 0));
    /* hora sem dia: hoje, se ainda não passou; senão amanhã */
    if(o.hora && !o.dia) o.dia = o.hora > agoraHM() ? hj : soma(hj, 1);
    if(o.repete && !o.dia) o.dia = o.repete === 'util' ? (semana(hj) % 6 ? hj : proximo(hj, 'util')) : hj;
    /* tira o que foi entendido (de trás pra frente) e junta os espaços */
    let t = s; tira.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { t = t.slice(0, a) + ' ' + t.slice(b); });
    t = t.replace(/\s+/g, ' ').replace(/\s+([,.;!?])/g, '$1').replace(/^[\s,.;-]+|[\s,;-]+$/g, '').trim();
    o.titulo = t || s.trim();
    /* o que a página já diz (a aba Hoje, a lista aberta), quando a frase não diz */
    if(base){ if(!o.dia && base.dia !== undefined) o.dia = base.dia; if(!o.lista && base.lista) o.lista = base.lista; }
    return o;
  }
  C.caderno = { entende, proximo };

  /* ---------- o banco ---------- */
  const faltaTabela = e => !!e && e.code !== 'PGRST204' && (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST202' || /corre_caderno|Could not find the table|does not exist/i.test(e.message || ''));
  async function carrega(forca){
    const u = C.uid() || ''; if(CD.uid !== u){ Object.assign(CD, { uid: u, t: [], ok: false, falta: false, corre: [], em: 0 }); }
    if(!u) return;
    if(CD.ind) return CD.ind;
    if(!forca && CD.ok && Date.now() - CD.em < 6e4) return;
    return (CD.ind = (async () => {
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      try{
        const [ab, fe] = await Promise.all([api.q('corre_caderno', { eq: { dono: u, feito: false }, limit: 5000 }), api.q('corre_caderno', { eq: { dono: u, feito: true }, gte: { feito_em: desde }, limit: 2000 })]);
        if(CD.uid !== u) return;
        CD.t = (ab || []).concat(fe || []); CD.ok = true; CD.falta = false; CD.erro = null;
      }catch(e){ if(faltaTabela(e)){ CD.falta = true; CD.ok = true; CD.t = []; } else CD.erro = e; }
      try{ CD.corre = await doCorre(u); }catch(e){ CD.corre = []; }
      CD.em = Date.now();
    })().finally(() => { CD.ind = null; }));
  }

  /* ---------- o que o Corre já sabe (de 7 dias atrás até 14 dias pra frente) ----------
     Cada um: { k, id, dia, hora, titulo, sub, href, ic }. Não se marca aqui: tocou, vai pra ferramenta */
  const LEAD_FIM = ['fechado', 'perdido', 'nao_encontrado'];
  async function doCorre(u){
    const hj = hoje(), fim = soma(hj, 14), out = [];
    const FMT = { carrossel: 'Carrossel', story: 'Story', reels: 'Reels' };
    const posts = api.q('corre_posts', { select: 'id,data,hora,titulo,status,ig_status,midia_url,marca_id,formato', eq: { dono: u }, gte: { data: soma(hj, -7) }, lte: { data: fim }, limit: 500 }).then(async ps => {
      ps = (ps || []).filter(p => p.data && p.ig_status !== 'publicado' && p.status !== 'postado' && p.status !== 'ideia');
      if(!ps.length) return;
      let nomes = {}; try{ const ms = await api.q('corre_portfolio', { select: 'id,marca', eq: { dono: u }, limit: 200 }); (ms || []).forEach(m => { nomes[m.id] = m.marca; }); }catch(e){}
      ps.forEach(p => {
        /* o que já passou e não saiu só entra se tem arte (rascunho de semana passada não é atraso) */
        if(p.data < hj && !p.midia_url && p.ig_status !== 'erro') return;
        const hora = p.hora ? String(p.hora).slice(0, 5) : null;
        out.push({ k: 'post', id: p.id, dia: p.data, hora, titulo: p.titulo || (FMT[p.formato] || 'Post') + ' sem título', sub: `Studio · ${nomes[p.marca_id] || 'post'}${p.ig_status === 'erro' ? ' · não saiu no Instagram' : p.ig_status === 'agendado' ? ' · programado' : ''}`, href: '#/studio/postar/' + p.id, ic: 'magia', erro: p.ig_status === 'erro' });
      });
    }).catch(() => {});
    const leads = !C.ferr('horus') ? null : api.q('corre_leads', { select: 'id,nome,prox,st,fonte,hist', eq: { dono: u }, lte: { prox: fim }, limit: 3000 }).then(L => {
      (L || []).filter(l => l.prox && !LEAD_FIM.includes(l.st)).forEach(l => {
        const ped = C.horusFunil && C.horusFunil.esperando ? C.horusFunil.esperando(l) : false;
        /* v4.36: o retorno do Hórus é de segunda a sexta (o do fim de semana aparece na segunda); o pedido fica no dia dele */
        out.push({ k: 'lead', id: l.id, dia: ped ? l.prox : C.horusDia(l.prox), hora: null, titulo: ped ? `Responder ${l.nome || 'o pedido'}` : `Retornar ${l.nome || 'cliente'}`, sub: ped ? 'Hórus · pediu orçamento' : 'Hórus · retorno', href: ped ? '#/horus/entrada' : '#/horus', ic: 'eye' });
      });
    }).catch(() => {});
    const vendas = api.q('corre_vendas', { select: 'id,cliente,vence,st,total,sinal', eq: { dono: u, st: 'fechado' }, lte: { vence: fim }, limit: 1000 }).then(L => {
      (L || []).filter(v => v.vence).forEach(v => {
        const falta = Math.max((Number(v.total) || 0) - (Number(v.sinal) || 0), 0);
        out.push({ k: 'venda', id: v.id, dia: v.vence, hora: null, titulo: `Receber de ${v.cliente || 'cliente'}`, sub: `Vendas · ${C.money(falta)}`, href: '#/vendas', ic: 'grana' });
      });
    }).catch(() => {});
    await Promise.all([posts, leads, vendas]);
    return out;
  }

  /* ---------- a lista de cada dia ---------- */
  const raiz = () => CD.t.filter(t => !t.pai);
  const subs = id => CD.t.filter(t => t.pai === id).sort(ordem);
  const daLista = t => !CD.lista || t.lista === CD.lista;
  /* a ordem dentro de um dia: com hora primeiro (pela hora), depois a prioridade, depois quem entrou antes */
  const ordem = (a, b) => (a.hora || '99') < (b.hora || '99') ? -1 : (a.hora || '99') > (b.hora || '99') ? 1
    : (a.prio || 4) - (b.prio || 4) || (a.ordem || 0) - (b.ordem || 0) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
  const listas = () => [...new Set(raiz().filter(t => t.lista && !t.feito).map(t => t.lista).concat(raiz().filter(t => t.lista).map(t => t.lista)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  /* o Corre só entra quando não tem lista escolhida (lista é coisa das tuas tarefas) */
  /* v4.34: o cliente e a cobrança que o piloto já pôs como tarefa (com o botão que resolve) não aparecem duas vezes */
  const doPiloto = () => new Set(CD.t.filter(t => (t.piloto === 'cobra' || t.piloto === 'esfria') && !t.feito && t.liga && t.liga.id).map(t => t.liga.id));
  const correDe = f => { if(CD.lista) return []; const P = doPiloto(); return CD.corre.filter(c => !P.has(c.id) && f(c)); };
  function doDia(iso){
    const t = raiz().filter(x => !x.feito && x.dia === iso && daLista(x)), c = correDe(x => x.dia === iso);
    return t.map(x => ({ x, t: 'tarefa' })).concat(c.map(x => ({ x, t: 'corre' }))).sort((a, b) => ordem(a.x, b.x));
  }
  const atrasadas = () => raiz().filter(x => !x.feito && x.dia && x.dia < hoje() && daLista(x)).map(x => ({ x, t: 'tarefa' }))
    .concat(correDe(x => x.dia < hoje()).map(x => ({ x, t: 'corre' }))).sort((a, b) => a.x.dia < b.x.dia ? -1 : a.x.dia > b.x.dia ? 1 : ordem(a.x, b.x));

  /* ---------- o desenho ---------- */
  const PRIO = { 1: 'Prioridade 1', 2: 'Prioridade 2', 3: 'Prioridade 3', 4: 'Sem prioridade' };
  function metaTarefa(t, comDia){
    const ss = subs(t.id), m = [];
    /* v4.34: o que o piloto automático pôs aqui */
    if(t.piloto && C.piloto) m.push(C.piloto.marca(t));
    if(comDia && t.dia) m.push(`<span class="cd-dia${t.dia < hoje() ? ' atras' : ''}">${esc(diaTxt(t.dia))}</span>`);
    if(t.hora) m.push(`<span class="cd-h">${ico('clock')}${esc(horaTxt(t.hora))}</span>`);
    if(t.repete){ const rt = repTxt(t.repete, cadaDe(t)); m.push(`<span title="${esc(rt)}">${ico('troca')}${esc(rt.replace(/^Tod[oa] /, ''))}</span>`);
      const sq = seguidas(t), nv = feitasDe(t).length;
      if(sq >= 2) m.push(`<span class="cd-seq" title="Feita ${sq} dias seguidos">${ico('fogo')}${sq} dias seguidos</span>`);
      else if(!diaria(t) && nv >= 2) m.push(`<span title="Feita ${nv} vezes">${ico('check')}${nv}x</span>`); }
    if(ss.length) m.push(`<span class="cd-sb" title="Subtarefas">${ico('check')}${ss.filter(s => s.feito).length}/${ss.length}</span>`);
    if(t.hora && Array.isArray(t.antes) && t.antes.length) m.push(`<span title="${esc(t.antes.map(antesTxt).join(', '))}">${ico('bell')}+${t.antes.length}</span>`);
    if(t.endereco) m.push(`<span class="cd-end" title="${esc(t.endereco)}">${ico('pin')}${esc(t.endereco.split(',')[0].slice(0, 40))}</span>`);
    if(anexosDe(t).length) m.push(`<span title="Arquivos">${ico('up')}${anexosDe(t).length}</span>`);
    if(t.nota) m.push(`<span title="Tem nota">${ico('edit')}</span>`);
    if(t.lista) m.push(`<span class="cd-ls">#${esc(t.lista)}</span>`);
    return m.length ? `<span class="cd-meta">${m.join('')}</span>` : '';
  }
  function itTarefa(t, comDia){
    return `<li class="cd-it p${t.prio || 4}${t.feito ? ' feito' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="cd-ck" data-act="cd-feita" data-id="${esc(t.id)}" aria-pressed="${t.feito ? 'true' : 'false'}" aria-label="${t.feito ? 'Desmarcar' : 'Marcar feita'}: ${esc(t.titulo)}" title="${esc(PRIO[t.prio || 4])}"><i>${ico('check')}</i></button>
      <button type="button" class="cd-tx" data-act="cd-abre" data-id="${esc(t.id)}"><b>${esc(t.titulo)}</b>${metaTarefa(t, comDia)}</button>${t.piloto && C.piloto ? C.piloto.botao(t) : ''}</li>`;
  }
  function itCorre(c, comDia){
    const m = [];
    if(comDia) m.push(`<span class="cd-dia${c.dia < hoje() ? ' atras' : ''}">${esc(diaTxt(c.dia))}</span>`);
    if(c.hora) m.push(`<span class="cd-h">${ico('clock')}${esc(horaTxt(c.hora))}</span>`);
    m.push(`<span>${esc(c.sub)}</span>`);
    return `<li class="cd-it cd-corre k-${c.k}${c.erro ? ' erro' : ''}"><span class="cd-ck cd-fer" aria-hidden="true">${ico(c.ic)}</span>
      <a class="cd-tx" href="${esc(c.href)}"><b>${esc(c.titulo)}</b><span class="cd-meta">${m.join('')}</span></a>${ico('next', 'cd-seta')}</li>`;
  }
  const item = (e, comDia) => e.t === 'tarefa' ? itTarefa(e.x, comDia) : itCorre(e.x, comDia);
  /* v4.25: a que repete e já foi feita hoje aparece nas feitas, com o dia em que volta; o tique desfaz */
  const repHoje = () => raiz().filter(t => !t.feito && t.repete && daLista(t) && feitasDe(t).includes(hoje()));
  function itRepFeita(t){
    const sq = seguidas(t);
    return `<li class="cd-it p${t.prio || 4} feito rep" data-id="${esc(t.id)}">
      <button type="button" class="cd-ck" data-act="cd-desfaz-rep" data-id="${esc(t.id)}" aria-pressed="true" aria-label="Desmarcar: ${esc(t.titulo)}" title="Desfazer"><i>${ico('check')}</i></button>
      <button type="button" class="cd-tx" data-act="cd-abre" data-id="${esc(t.id)}"><b>${esc(t.titulo)}</b><span class="cd-meta"><span title="${esc(repTxt(t.repete, cadaDe(t)))}">${ico('troca')}volta ${esc(diaTxt(t.dia))}</span>${sq >= 2 ? `<span class="cd-seq">${ico('fogo')}${sq} dias seguidos</span>` : ''}</span></button></li>`;
  }
  /* o dia em duas partes: o que tem hora (a régua da hora na esquerda) e o que é "no dia" */
  function diaHTML(L, comDia){
    const ch = L.filter(e => e.x.hora), sh = L.filter(e => !e.x.hora);
    return `${ch.length ? `<ol class="cd-l cd-horas">${ch.map(e => item(e, comDia)).join('')}</ol>` : ''}${sh.length ? `${ch.length ? '<p class="cd-nodia">no dia</p>' : ''}<ol class="cd-l">${sh.map(e => item(e, comDia)).join('')}</ol>` : ''}`;
  }
  const secao = (id, tit, n, corpo, cls) => `<section class="cd-sec${cls ? ' ' + cls : ''}" aria-labelledby="cd-s-${id}"><h2 id="cd-s-${id}">${tit}${n ? ` <small class="num">${n}</small>` : ''}</h2>${corpo}</section>`;
  const novoNoDia = (iso, txt) => `<button type="button" class="cd-mais" data-act="cd-nodia" data-dia="${esc(iso)}">${ico('plus')}${esc(txt || 'Tarefa')}</button>`;

  function corpoHoje(){
    const hj = hoje(), at = atrasadas(), L = doDia(hj), feitas = raiz().filter(t => t.feito && t.feito_em && C.hojeBR(new Date(t.feito_em)) === hj && daLista(t)).sort((a, b) => String(b.feito_em).localeCompare(String(a.feito_em)));
    const rep = repHoje(), nT = L.filter(e => e.t === 'tarefa').length + at.filter(e => e.t === 'tarefa').length, nF = feitas.length + rep.length, tot = nT + nF;
    const ab = ls.get(K_FEITAS) === '1';
    let h = '';
    h += faroHTML();
    /* v4.34: o convite do piloto automático (some quando liga ou no "Agora não") */
    if(C.piloto) h += C.piloto.faixa();
    if(tot) h += `<div class="cd-prog" role="img" aria-label="${nF} de ${tot} tarefas de hoje feitas"><span><b class="num">${nF}</b> de <b class="num">${tot}</b> feitas hoje</span><i><b style="width:${Math.round(100 * nF / tot)}%"></b></i></div>`;
    if(at.length) h += secao('atras', 'Ficou pra trás', at.length, `<ol class="cd-l">${at.map(e => item(e, true)).join('')}</ol>${at.some(e => e.t === 'tarefa') ? `<button type="button" class="lnk cd-pra-hoje" data-act="cd-pra-hoje">${ico('cal')}Passar as minhas pra hoje</button>` : ''}`, 'atras');
    h += secao('hoje', 'Hoje', L.length, L.length ? diaHTML(L) + novoNoDia(hj) : (!at.length && nT === 0 && nF ? '<p class="cd-carimbo"><span>Caderninho em dia</span></p>' : `<p class="cd-vazio">${nF ? 'Fechou o de hoje.' : 'Nada pra hoje ainda.'} Anota aí em cima o que tem que sair hoje: o Corre junta com o teu Studio, o Hórus e as Vendas.</p>`) + (L.length ? '' : novoNoDia(hj)));
    if(nF) h += `<details class="cd-sec cd-feitas"${ab ? ' open' : ''} data-feitas><summary><h2>Feitas hoje <small class="num">${nF}</small></h2></summary><ol class="cd-l">${rep.map(itRepFeita).join('')}${feitas.map(t => itTarefa(t)).join('')}</ol></details>`;
    return h;
  }
  function corpoProx(){
    const hj = hoje(); let h = '';
    for(let i = 1; i <= 14; i++){
      const iso = soma(hj, i), L = doDia(iso);
      if(i > 7 && !L.length) continue;
      const nome = i === 1 ? 'Amanhã' : `${DIAS[semana(iso)].replace(/^./, c => c.toUpperCase())} ${ddmm(iso)}`;
      h += `<section class="cd-sec cd-dia-s${semana(iso) === 0 || semana(iso) === 6 ? ' fds' : ''}" aria-labelledby="cd-d-${iso}"><h2 id="cd-d-${iso}">${esc(nome)}${L.length ? ` <small class="num">${L.length}</small>` : ''}</h2>${L.length ? diaHTML(L) : ''}${novoNoDia(iso)}</section>`;
    }
    const depois = raiz().filter(t => !t.feito && t.dia && t.dia > soma(hj, 14) && daLista(t)).sort((a, b) => a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : ordem(a, b));
    if(depois.length) h += secao('depois', 'Mais pra frente', depois.length, `<ol class="cd-l">${depois.map(t => itTarefa(t, true)).join('')}</ol>`);
    return h;
  }
  function corpoSolta(){
    const L = raiz().filter(t => !t.feito && !t.dia && daLista(t)).sort(ordem);
    return secao('solta', 'Algum dia', L.length, L.length ? `<ol class="cd-l">${L.map(t => itTarefa(t)).join('')}</ol>` : '<p class="cd-vazio">A caixa das ideias sem dia: anota sem dizer quando e ela cai aqui. Quando der, abre e põe um dia.</p>');
  }
  /* ---------- v4.30 · a Semana: os 7 dias em colunas e o "Algum dia" no fim; a tarefa vai de um dia pro outro
     arrastando (no dedo: segura um instante e arrasta) ou nas setinhas do cartão ---------- */
  function cartao(t, atras){
    const hj = hoje(), m = [];
    if(atras) m.push(`<span class="cd-dia atras">${esc(diaTxt(t.dia))}</span>`);
    if(t.hora) m.push(`<span class="cd-h">${ico('clock')}${esc(horaTxt(t.hora))}</span>`);
    if(t.repete) m.push(`<span title="${esc(repTxt(t.repete, cadaDe(t)))}">${ico('troca')}</span>`);
    if(t.lista && !CD.lista) m.push(`<span class="cd-ls">#${esc(t.lista)}</span>`);
    const volta = !t.dia || t.dia <= hj;
    return `<li class="cd-card p${t.prio || 4}${atras ? ' atras' : ''}" data-id="${esc(t.id)}">
      <button type="button" class="cd-ck" data-act="cd-feita" data-id="${esc(t.id)}" aria-pressed="false" aria-label="Marcar feita: ${esc(t.titulo)}"><i>${ico('check')}</i></button>
      <button type="button" class="cd-tx" data-act="cd-abre" data-id="${esc(t.id)}"><b>${esc(t.titulo)}</b>${m.length ? `<span class="cd-meta">${m.join('')}</span>` : ''}</button>
      <span class="cd-mv"><button type="button" class="cd-mvb" data-act="cd-mv" data-id="${esc(t.id)}" data-d="-1" aria-label="Passar pro dia anterior: ${esc(t.titulo)}"${volta ? ' disabled' : ''}>${ico('prev')}</button><button type="button" class="cd-mvb" data-act="cd-mv" data-id="${esc(t.id)}" data-d="1" aria-label="${!t.dia || t.dia < hj ? 'Trazer pra hoje' : 'Passar pro dia seguinte'}: ${esc(t.titulo)}">${ico('next')}</button></span></li>`;
  }
  function corpoSemana(){
    const hj = hoje(), ini = soma(hj, CD.sem * 7), dias = Array.from({ length: 7 }, (x, i) => soma(ini, i));
    const col = iso => {
      const L = raiz().filter(x => !x.feito && x.dia === iso && daLista(x)).sort(ordem);
      const at = iso === hj ? raiz().filter(x => !x.feito && x.dia && x.dia < hj && daLista(x)).sort((a, b) => a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : ordem(a, b)) : [];
      const cc = correDe(x => x.dia === iso), n = L.length + at.length, fds = semana(iso) === 0 || semana(iso) === 6;
      const nome = iso === hj ? 'Hoje' : iso === soma(hj, 1) ? 'Amanhã' : DIAS[semana(iso)].replace(/^./, c => c.toUpperCase());
      return `<section class="cd-col${iso === hj ? ' hoje' : ''}${fds ? ' fds' : ''}" data-dia="${iso}" aria-label="${esc(`${nome}, ${ddmm(iso)}: ${n} ${n === 1 ? 'tarefa' : 'tarefas'}`)}">
        <header><b>${esc(nome)}</b><small>${ddmm(iso)}</small>${n ? `<span class="cd-carga${n >= 6 ? ' cheia' : ''}">${n}</span>` : ''}</header>
        <ol class="cd-cl">${at.map(t => cartao(t, true)).join('')}${L.map(t => cartao(t)).join('')}${cc.map(c => `<li class="cd-card cd-corre-c k-${c.k}"><a href="${esc(c.href)}"><span class="cd-fer" aria-hidden="true">${ico(c.ic)}</span><b>${esc(c.titulo)}</b><span class="cd-meta">${c.hora ? `<span class="cd-h">${esc(horaTxt(c.hora))}</span>` : ''}<span>${esc(c.sub.split(' · ')[0])}</span></span></a></li>`).join('')}</ol>
        ${novoNoDia(iso)}</section>`;
    };
    const soltas = raiz().filter(x => !x.feito && !x.dia && daLista(x)).sort(ordem);
    const toque = matchMedia && matchMedia('(pointer: coarse)').matches;
    return `<div class="cd-sem-nav"><button type="button" class="cbtn" data-act="cd-sem" data-d="-1" aria-label="Semana de antes"${CD.sem <= 0 ? ' disabled' : ''}>${ico('prev')}</button>
        <b>${CD.sem ? `${ddmm(dias[0])} a ${ddmm(dias[6])}` : 'Os próximos 7 dias'}</b><button type="button" class="cbtn" data-act="cd-sem" data-d="1" aria-label="Semana seguinte"${CD.sem >= 8 ? ' disabled' : ''}>${ico('next')}</button>
        <small>${toque ? 'Segura a tarefa e arrasta pro dia.' : 'Arrasta a tarefa pro dia.'}</small></div>
      <div class="cd-sem" id="cd-sem">${dias.map(col).join('')}<section class="cd-col solta" data-dia="" aria-label="Algum dia: ${soltas.length}"><header><b>Algum dia</b>${soltas.length ? `<span class="cd-carga">${soltas.length}</span>` : ''}</header><ol class="cd-cl">${soltas.map(t => cartao(t)).join('')}</ol>${soltas.length ? '' : '<p class="cd-col-v">Solta aqui o que não tem dia.</p>'}</section></div>`;
  }
  /* passar pra outro dia (null = Algum dia). A que repete precisa de dia; a hora vai junto */
  async function moveDia(id, novo, foco){
    const t = CD.t.find(x => x.id === id); if(!t || (t.dia || null) === (novo || null)) return;
    if(!novo && t.repete){ toast('A que repete precisa de um dia: passa ela pra outro dia em vez de "Algum dia".'); return; }
    const patch = novo ? { dia: novo } : { dia: null, hora: null }, antes = { dia: t.dia, hora: t.hora };
    Object.assign(t, patch); repinta();
    try{ await api.upd('corre_caderno', { id }, patch); }
    catch(e){ Object.assign(t, antes); repinta(); toast(C.errMsg(e)); return; }
    C.sinaisAtualiza && C.sinaisAtualiza();
    toast(novo ? `Passou pra ${novo === hoje() ? 'hoje' : diaTxt(novo)}.` : 'Foi pra "Algum dia".', 2200);
    if(foco){ const b = document.querySelector(`.cd-card[data-id="${CSS.escape(id)}"] [data-act="cd-mv"][data-d="${foco}"]`) || document.querySelector(`.cd-card[data-id="${CSS.escape(id)}"] .cd-tx`); if(b){ if(b.disabled) b.parentElement.querySelector('[data-d="1"]').focus(); else b.focus(); } }
  }
  /* arrastar (o jeito do funil do Hórus: o mouse arrasta; o dedo segura um instante e arrasta) */
  const DR = { card: null, on: false, engole: 0 };
  function arrastaLiga(board){
    if(!board || board.dataset.liga) return; board.dataset.liga = '1';
    board.addEventListener('pointerdown', e => {
      if(e.button > 0 || DR.on) return;
      const card = e.target.closest('.cd-card[data-id]'); if(!card || e.target.closest('.cd-ck, .cd-mv')) return;
      const r = card.getBoundingClientRect();
      solta(true);
      Object.assign(DR, { card, board, id: card.dataset.id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, toque: e.pointerType !== 'mouse', on: false, alvo: null, t: 0, raf: 0 });
      if(DR.toque) DR.t = setTimeout(ativa, 320);
    });
    board.addEventListener('click', e => { if(Date.now() - DR.engole < 450){ e.preventDefault(); e.stopPropagation(); } }, true);
    board.addEventListener('contextmenu', e => { if(DR.card) e.preventDefault(); });
  }
  function ativa(){
    if(!DR.card || DR.on || !DR.card.isConnected) return;
    DR.on = true;
    const g = DR.card.cloneNode(true); g.classList.add('cd-fantasma'); g.removeAttribute('data-id'); g.setAttribute('aria-hidden', 'true');
    g.style.width = DR.w + 'px'; document.body.appendChild(g); DR.g = g;
    DR.card.classList.add('cd-pega'); document.body.classList.add('cd-arrastando');
    try{ if(DR.toque && navigator.vibrate) navigator.vibrate(12); }catch(e){}
    poe(); DR.raf = requestAnimationFrame(rola);
  }
  function poe(){
    if(!DR.g) return;
    DR.g.style.transform = `translate(${DR.x - DR.dx}px, ${DR.y - DR.dy}px) rotate(2deg)`;
    const el = document.elementFromPoint(DR.x, DR.y), col = el && el.closest ? el.closest('.cd-col') : null;
    if(col !== DR.alvo){ if(DR.alvo) DR.alvo.classList.remove('cd-sobre'); DR.alvo = col; if(col) col.classList.add('cd-sobre'); }
  }
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
    if(DR.card) DR.card.classList.remove('cd-pega');
    if(alvo) alvo.classList.remove('cd-sobre');
    document.body.classList.remove('cd-arrastando');
    Object.assign(DR, { card: null, on: false, g: null, alvo: null });
    if(!era || cancela) return;
    DR.engole = Date.now();
    if(alvo && alvo.dataset.dia !== undefined) moveDia(id, alvo.dataset.dia || null);
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
  document.addEventListener('touchmove', e => { if(DR.on) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && DR.on){ e.stopPropagation(); solta(true); } }, true);

  /* ---------- v4.30 · despejar a cabeça: várias de uma vez ----------
     Uma por linha; na mesma linha, a vírgula (ou o "e") separa quando o pedaço começa com um verbo ("ligar", "pagar",
     "manda") ou quando os dois lados têm o próprio dia: "comprar pão, leite e ovos" fica uma só. Linha que é só um dia ou
     uma lista com dois pontos ("amanhã:", "#Casa:") vale pras de baixo */
  const NAO_VERBO = new Set(['lugar', 'bar', 'mar', 'par', 'dever', 'prazer', 'mulher', 'colher', 'qualquer', 'flor', 'cor', 'dor', 'amor', 'motor', 'doutor', 'senhor', 'valor', 'melhor', 'pior', 'maior', 'menor', 'setor', 'fornecedor', 'elevador', 'computador', 'sabor', 'calor', 'favor', 'exterior', 'interior', 'anterior', 'superior', 'professor', 'diretor', 'gestor', 'editor', 'autor', 'ator', 'leitor', 'cliente', 'contador', 'vendedor', 'pintor', 'cantor']);
  const VERBOS = new Set(['liga', 'manda', 'paga', 'compra', 'faz', 've', 'leva', 'busca', 'marca', 'chama', 'responde', 'envia', 'grava', 'posta', 'revisa', 'confere', 'entrega', 'cobra', 'agenda', 'resolve', 'organiza', 'estuda', 'treina', 'limpa', 'lava', 'arruma', 'passa', 'pega', 'traz', 'tira', 'troca', 'separa', 'renova', 'atualiza', 'corta', 'imprime', 'assina', 'reserva', 'reuniao', 'ligacao', 'consulta', 'dentista', 'medico', 'academia', 'mercado', 'banco']);
  function ehVerbo(w){ w = SEM(String(w || '')).replace(/[^a-z]/g, ''); if(!w || NAO_VERBO.has(w)) return false; return VERBOS.has(w) || (w.length >= 4 && /(ar|er|ir|or)$/.test(w)); }
  const FILL = /\b(pra|para|de|do|da|dos|das|no|na|nos|nas|as|os|a|o|e|coisas|tarefas|tarefa|lista|dia|fazer)\b/g;
  /* o cabeçalho "amanhã" / "#Casa": devolve o dia e a lista, ou null se tiver mais coisa escrita */
  function cabecalho(h){
    const o = entende(h, {}), sobra = o.titulo.trim() === h.trim() ? '' : SEM(o.titulo).replace(FILL, '').replace(/[^a-z0-9]/g, '');
    return (o.dia || o.lista) && !sobra && !o.hora ? { dia: o.dia, lista: o.lista } : null;
  }
  function separa(txt, base0){
    const B0 = Object.assign({}, base0 || {});
    let ctx = Object.assign({}, B0);
    const out = [];
    String(txt || '').replace(/\r/g, '').split(/\n|;|\s[•·]\s/).forEach(l0 => {
      let l = l0.replace(/^\s*(?:[-*•·▪◦–—>]+|\d{1,2}[.)]|\[[ xX]?\])\s*/, '').trim(); if(!l) return;
      /* "amanhã:" sozinho, ou "amanhã: ligar pro João" */
      const mc = /^([^:]{1,40}):\s*(.*)$/.exec(l);
      if(mc){ const h = cabecalho(mc[1]); if(h){ ctx = Object.assign({}, B0, h.dia ? { dia: h.dia } : {}, h.lista ? { lista: h.lista } : {}); l = mc[2].trim(); if(!l) return; } }
      const tk = l.split(/(,\s*|\s+e\s+depois\s+|\s+depois\s+|\s+e\s+)/i);
      let cur = tk[0];
      const quando = x => { const o = entende(x, {}); return !!(o.dia || o.hora); };
      for(let i = 1; i < tk.length; i += 2){
        const sep = tk[i], pc = (tk[i + 1] || '').trim(); if(!pc){ cur += sep; continue; }
        if(ehVerbo(pc.split(/\s+/)[0]) || (quando(cur) && quando(pc))){ out.push([cur, ctx]); cur = pc; } else cur += sep + pc;
      }
      out.push([cur, ctx]);
    });
    return out.map(([t, c]) => entende(t.replace(/[:\s]+$/, ''), c)).filter(o => o.titulo && o.titulo.trim().length > 1).slice(0, 30);
  }
  C.caderno.separa = separa;
  const DS = { L: [] };
  function despeja(txt){
    C.sheet(`<form class="cd-dsp" id="cd-dsp" autocomplete="off"><div class="sheet-head"><h2>${ico('caderno')} Despeja a cabeça</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="cd-dsp-i">Escreve, ou dita no microfone do teclado, tudo o que tá na cabeça: uma por linha, ou separado por vírgula. O Caderninho separa e entende o dia, a hora e a lista de cada uma.</p>
      <label class="sr-only" for="cd-dsp-t">O que tá na cabeça</label><textarea id="cd-dsp-t" rows="6" maxlength="4000" placeholder="amanhã: mandar o orçamento da padaria 15h, ligar pro contador&#10;pagar o boleto dia 5 #Casa&#10;gravar reels quinta 10h !1"></textarea>
      <p class="cd-dsp-n" id="cd-dsp-n" aria-live="polite"></p><ol class="cd-dsp-l" id="cd-dsp-l"></ol>
      <div class="acts"><button type="submit" class="btn pri" id="cd-dsp-ok" disabled>Anotar</button><button type="button" class="btn ghost" data-close>Agora não</button></div></form>`, 'cd-folhinha');
    const f = $('cd-dsp'), t = $('cd-dsp-t'); if(!f || !t) return;
    const ve = () => {
      DS.L = separa(t.value, base()).map(o => Object.assign(o, { on: true }));
      $('cd-dsp-l').innerHTML = DS.L.map((o, i) => `<li><label><input type="checkbox" data-i="${i}" checked><span><b>${esc(o.titulo)}</b>${chipsDe(o).map(x => `<span class="cd-chip">${x}</span>`).join('')}</span></label></li>`).join('');
      conta();
    };
    const conta = () => { const n = DS.L.filter(o => o.on).length, ok = $('cd-dsp-ok'); ok.disabled = !n; ok.textContent = n ? `Anotar ${n === 1 ? '1 tarefa' : `${n} tarefas`}` : 'Anotar'; $('cd-dsp-n').textContent = DS.L.length ? `${DS.L.length === 1 ? 'Achei 1' : `Achei ${DS.L.length}`}:` : ''; };
    t.value = txt || ''; t.addEventListener('input', ve);
    $('cd-dsp-l').addEventListener('change', e => { const i = Number(e.target.dataset.i); if(DS.L[i]){ DS.L[i].on = e.target.checked; conta(); } });
    C.umaVez ? C.umaVez(f, () => criaVarias()) : f.addEventListener('submit', e => { e.preventDefault(); criaVarias(); });
    ve(); setTimeout(() => { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }, 30);
  }
  async function criaVarias(){
    const L = DS.L.filter(o => o.on); if(!L.length) return;
    let n = 0;
    for(const o of L){ try{ if(await cria(o, null, true)) n++; }catch(e){ toast(semCada(e) || C.errMsg(e)); break; } }
    C.closeSheet(); repinta(); C.sinaisAtualiza && C.sinaisAtualiza();
    if(!n) return;
    const hj = hoje(), por = {}; L.slice(0, n).forEach(o => { const k = !o.dia ? 'sem dia' : o.dia === hj ? 'pra hoje' : o.dia === soma(hj, 1) ? 'pra amanhã' : 'pra frente'; por[k] = (por[k] || 0) + 1; });
    toast(`${n === 1 ? '1 tarefa anotada' : `${n} tarefas anotadas`}: ${Object.keys(por).map(k => `${por[k]} ${k}`).join(', ')}.`, 4200);
  }

  /* ---------- v4.30 · o Farejar (poder do bicho): a tarefa da vez no alto do Hoje ----------
     A que ficou pra trás primeiro, depois a que tem hora chegando (até 1h30), depois a prioridade */
  function daVez(){
    const hj = hoje(), ag = agoraHM(), min = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    const nota = t => { let s = 0; if(t.dia < hj) s += 1000 + Math.min(30, entre(t.dia, hj)) * 10;
      if(t.hora){ const dm = min(t.hora) - min(ag); s += dm <= 0 ? 600 : dm <= 90 ? 500 - dm : -60; }
      return s + (4 - (t.prio || 4)) * 120; };
    const L = raiz().filter(t => !t.feito && t.dia && t.dia <= hj && daLista(t));
    const fora = L.filter(t => !CD.pulei.has(t.id));
    return (fora.length ? fora : L).sort((a, b) => nota(b) - nota(a) || ordem(a, b))[0] || null;
  }
  function faroHTML(){
    if(!(C.bicho && C.bicho.tem('farejar'))) return '';
    const t = daVez(); if(!t) return '';
    const me = C.bicho.me(), maisDe1 = raiz().filter(x => !x.feito && x.dia && x.dia <= hoje() && daLista(x)).length > 1;
    return `<div class="cd-faro" data-id="${esc(t.id)}">${C.bicho.cvHTML({ esp: me.especie, etapa: C.bicho.etapa(), meu: 1 }, 'cd-faro-cv')}
      <div class="cd-faro-tx"><small>${esc(C.bicho.golpe(me.especie, 'farejar'))}: a da vez</small><b>${esc(t.titulo)}</b>${metaTarefa(t, t.dia < hoje())}</div>
      <div class="cd-faro-b"><button type="button" class="btn sm pri" data-act="cd-feita" data-id="${esc(t.id)}">${ico('check')} Feita</button>${C.bicho.tem('foco') ? `<button type="button" class="btn sm" data-act="cd-foco" data-id="${esc(t.id)}">${ico('clock')} Foco</button>` : ''}${maisDe1 ? `<button type="button" class="btn sm ghost" data-act="cd-faro-outra" data-id="${esc(t.id)}">Outra</button>` : ''}</div></div>`;
  }

  /* ---------- v4.30 · o Foco (poder do bicho): 25 minutos só com uma tarefa ----------
     O relógio mora no aparelho (sair e voltar, ou recarregar, continua de onde tava) */
  const K_FOCO = 'corre-foco';
  const focoLe = () => { try{ const f = JSON.parse(ls.get(K_FOCO) || 'null'); return f && f.id ? f : null; }catch(e){ return null; } };
  const focoGrava = f => ls.set(K_FOCO, f ? JSON.stringify(f) : '');
  const resta = f => f.dur - ((f.parou || Date.now()) - f.ini - (f.pausa || 0));
  const FC = { tk: 0, trava: null, tocou: false };
  function focoAbre(id){ const t = CD.t.find(x => x.id === id); if(!t) return; C.closeSheet(); focoGrava({ id, ini: Date.now(), dur: 25 * 6e4, pausa: 0, parou: 0 }); FC.tocou = false; focoMostra(); }
  function focoMostra(){
    const f = focoLe(); if(!f) return;
    const t = CD.t.find(x => x.id === f.id); if(!t || t.feito){ focoGrava(null); return; }
    const old = $('cd-foco'); if(old) old.remove();
    const me = C.bicho && C.bicho.me();
    const box = document.createElement('div'); box.className = 'cd-foco'; box.id = 'cd-foco';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'cd-foco-tit');
    box.innerHTML = `<div class="cd-foco-in"><p class="cd-foco-k">${ico('clock')} ${esc(me ? C.bicho.golpe(me.especie, 'foco') : 'Foco')} · modo foco</p>
      <div class="cd-foco-anel"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fundo" cx="60" cy="60" r="54"/><circle class="arco" id="cd-foco-arco" cx="60" cy="60" r="54" pathLength="100"/></svg>
        ${me ? C.bicho.cvHTML({ esp: me.especie, etapa: C.bicho.etapa(), meu: 1 }, 'cd-foco-cv') : ''}</div>
      <time class="cd-foco-t num" id="cd-foco-t">25:00</time>
      <h2 class="cd-foco-tit" id="cd-foco-tit">${esc(t.titulo)}</h2>
      <p class="cd-foco-msg" id="cd-foco-msg" aria-live="polite">Só essa agora. O resto espera.</p>
      <div class="cd-foco-b"><button type="button" class="btn pri" data-act="cd-foco-fechei">${ico('check')} Fechei</button><button type="button" class="btn" data-act="cd-foco-pausa" id="cd-foco-pausa">Pausar</button><button type="button" class="btn ghost" data-act="cd-foco-mais">+5 min</button><button type="button" class="btn ghost" data-act="cd-foco-sai">Sair</button></div></div>`;
    document.body.appendChild(box); document.body.classList.add('cd-focado');
    if(C.bicho) C.bicho.liga(box);
    box.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); focoFecha(true); } });
    setTimeout(() => { const b = box.querySelector('[data-act="cd-foco-fechei"]'); if(b) b.focus(); }, 30);
    /* a tela não apaga enquanto o foco roda (onde o navegador deixa) */
    try{ if(navigator.wakeLock && !FC.trava) navigator.wakeLock.request('screen').then(w => { FC.trava = w; }).catch(() => {}); }catch(e){}
    clearInterval(FC.tk); FC.tk = setInterval(focoTique, 250); focoTique();
  }
  function focoTique(){
    const f = focoLe(), box = $('cd-foco'); if(!f || !box){ clearInterval(FC.tk); return; }
    const r = Math.max(0, resta(f)), m = Math.floor(r / 6e4), sg = Math.floor(r / 1e3) % 60;
    $('cd-foco-t').textContent = `${String(m).padStart(2, '0')}:${String(sg).padStart(2, '0')}`;
    $('cd-foco-arco').style.strokeDashoffset = String(100 * (1 - r / f.dur));
    const pb = $('cd-foco-pausa'); if(pb){ pb.textContent = f.parou ? 'Seguir' : 'Pausar'; pb.hidden = r <= 0; }
    box.classList.toggle('pausado', !!f.parou);
    if(r <= 0 && !FC.tocou){
      FC.tocou = true; box.classList.add('fim');
      $('cd-foco-msg').textContent = 'Deu os 25. Fechou? Se faltou pouco, mais 5.';
      try{ const A = new (window.AudioContext || window.webkitAudioContext)(); [0, .18, .36].forEach((x, i) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = [660, 880, 1320][i]; o.type = 'triangle'; g.gain.setValueAtTime(.0001, A.currentTime + x); g.gain.linearRampToValueAtTime(.13, A.currentTime + x + .02); g.gain.exponentialRampToValueAtTime(.0001, A.currentTime + x + .5); o.connect(g); g.connect(A.destination); o.start(A.currentTime + x); o.stop(A.currentTime + x + .55); }); }catch(e){}
      try{ if(navigator.vibrate) navigator.vibrate([60, 80, 60]); }catch(e){}
    }
  }
  function focoFecha(esquece){
    clearInterval(FC.tk); const b = $('cd-foco'); if(b) b.remove(); document.body.classList.remove('cd-focado');
    try{ if(FC.trava){ FC.trava.release(); FC.trava = null; } }catch(e){}
    if(esquece) focoGrava(null);
  }

  const contaAba = k => k === 'hoje' ? doDia(hoje()).length + atrasadas().length : k === 'solta' ? raiz().filter(t => !t.feito && !t.dia && daLista(t)).length : 0;
  function corpo(){
    if(CD.falta) return '<section class="card cd-falta"><p>O Caderninho liga quando o banco do Corre atualizar (o delta-v419.sql). Já, já.</p></section>';
    if(CD.erro && !CD.t.length) return `<section class="card"><p>${esc(C.errMsg(CD.erro, 'Não deu pra abrir o Caderninho agora.'))}</p><div class="acts"><button type="button" class="btn" data-act="cd-rele">${ico('troca')} Tentar de novo</button></div></section>`;
    return CD.aba === 'prox' ? corpoProx() : CD.aba === 'solta' ? corpoSolta() : CD.aba === 'semana' ? corpoSemana() : corpoHoje();
  }
  function placeholder(){
    return CD.aba === 'solta' ? 'Anota uma ideia sem dia…' : CD.aba === 'prox' || CD.aba === 'semana' ? 'Ex.: reunião sexta 10h #Trabalho' : 'Ex.: mandar orçamento 15h #Trabalho !1';
  }
  function pinta(app){
    const hj = hoje(), d = new Date(hj + 'T12:00:00Z'), L = listas();
    if(CD.lista && !L.includes(CD.lista)) L.unshift(CD.lista);
    const fx = C.push && C.push.faixa ? C.push.faixa('caderno') : '';
    app.innerHTML = C.header('caderno') + `<main class="wrap cd${CD.aba === 'semana' ? ' cd-larga' : ''}" id="cd">
      <header class="cd-top">
        <div class="cd-capa"><div class="cd-capa-d"><p class="cd-k">${ico('caderno')}Caderninho<time class="cd-relogio num" id="cd-relogio" aria-label="Agora">${esc(agoraHM())}</time></p><h1><span class="cd-dsem">${esc(DIAS[d.getUTCDay()])}</span><span class="cd-dnum num">${d.getUTCDate()}</span><span class="cd-dmes">${esc(C.MESES_L ? C.MESES_L[d.getUTCMonth()] : C.MESES[d.getUTCMonth()])}</span></h1></div>${C.bicho && !CD.falta ? C.bicho.capaHTML() : ''}</div>
        <form class="cd-add" id="cd-add" autocomplete="off"><label class="sr-only" for="cd-novo">Anotar uma tarefa</label>
          <span class="cd-add-l">${ico('plus')}<input id="cd-novo" name="t" maxlength="300" placeholder="${esc(placeholder())}" enterkeyhint="done"><button type="button" class="cd-varias" data-act="cd-despeja" title="Despejar várias de uma vez" aria-label="Despejar várias tarefas de uma vez">${ico('caderno')}<span>Várias</span></button></span>
          <button type="submit" class="btn pri">Anotar</button>
          <p class="cd-entendi" id="cd-entendi" aria-live="polite"></p></form>
      </header>
      ${fx}
      <nav class="cd-abas" role="tablist" aria-label="Caderninho">${ABAS.map(([k, t]) => { const n = contaAba(k); return `<button type="button" role="tab" class="cd-aba" data-act="cd-aba" data-k="${k}" aria-selected="${CD.aba === k}" tabindex="${CD.aba === k ? 0 : -1}">${esc(t)}${n ? ` <small class="num">${n}</small>` : ''}</button>`; }).join('')}</nav>
      ${L.length ? `<div class="cd-listas" role="group" aria-label="Listas"><button type="button" class="cd-lst${CD.lista ? '' : ' on'}" data-act="cd-lista" data-l="" aria-pressed="${!CD.lista}">Tudo</button>${L.map(l => `<button type="button" class="cd-lst${CD.lista === l ? ' on' : ''}" data-act="cd-lista" data-l="${esc(l)}" aria-pressed="${CD.lista === l}">#${esc(l)}</button>`).join('')}</div>` : ''}
      <div class="cd-folha" id="cd-corpo" role="tabpanel">${CD.ok ? corpo() : '<p class="cd-vazio">Abrindo o caderninho…</p>'}</div>
      <p class="fine cd-pe">Anota numa frase: o Caderninho entende <b>hoje</b>, <b>amanhã</b>, <b>sexta</b>, <b>25/10</b>, <b>15h</b>, <b>todo dia</b>, <b>#lista</b> e <b>!1</b> (prioridade). Com hora, o celular avisa na hora. Tem muita coisa na cabeça? Toca em <b>Várias</b> e despeja tudo de uma vez.</p>
    </main>`;
    ouveAdd();
    if(C.bicho){ C.bicho.liga($('cd')); if(!CD.falta) C.bicho.carrega(); }
    if(CD.aba === 'semana') arrastaLiga($('cd-sem'));
  }
  /* repinta só o miolo (marcar, mudar de aba) sem perder o que tava escrito no anotar */
  function repinta(){
    const el = $('cd'); if(!el){ return; }
    const inp = $('cd-novo'), v = inp ? inp.value : '', foco = document.activeElement === inp;
    pinta($('app'));
    const i2 = $('cd-novo'); if(i2){ i2.value = v; mostraEntendi(); if(foco) i2.focus(); }
  }

  /* ---------- anotar ---------- */
  function base(){ return { dia: CD.aba === 'hoje' || CD.aba === 'semana' ? hoje() : CD.aba === 'solta' ? null : undefined, lista: CD.lista || '' }; }
  function chipsDe(o){
    const c = [];
    if(o.dia) c.push(`${ico('cal')}${esc(diaTxt(o.dia))}`);
    if(o.hora) c.push(`${ico('clock')}${esc(horaTxt(o.hora))}`);
    if(o.repete) c.push(`${ico('troca')}${esc(repTxt(o.repete, o.cada))}`);
    if(o.lista) c.push(`#${esc(o.lista)}`);
    o.antes.forEach(m => c.push(`${ico('bell')}${esc(antesTxt(m))}`));
    if(o.prio && o.prio < 4) c.push(`<span class="p${o.prio}">${esc(PRIO[o.prio])}</span>`);
    return c;
  }
  function mostraEntendi(){
    const i = $('cd-novo'), p = $('cd-entendi'); if(!i || !p) return;
    const v = i.value.trim(); if(!v){ p.innerHTML = ''; return; }
    const o = entende(v, base()), c = chipsDe(o);
    p.innerHTML = c.length ? `<span class="cd-ent-t">${esc(o.titulo)}</span>${c.map(x => `<span class="cd-chip">${x}</span>`).join('')}` : '';
  }
  function ouveAdd(){
    const f = $('cd-add'), i = $('cd-novo'); if(!f || !i) return;
    i.addEventListener('input', mostraEntendi);
    /* v4.30: colou várias linhas: vira o despejar (cada linha uma tarefa) */
    i.addEventListener('paste', e => {
      const tx = e.clipboardData && e.clipboardData.getData('text'); if(!tx) return;
      if(tx.split(/\r?\n/).filter(x => x.trim()).length < 2) return;
      e.preventDefault(); despeja((i.value.trim() ? i.value.trim() + '\n' : '') + tx);
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = i.value.trim(); if(!v) { i.focus(); return; }
      const o = entende(v, base());
      const ok = await cria(o);
      if(ok){ i.value = ''; mostraEntendi(); i.focus(); }
    });
  }
  async function cria(o, pai, quieto){
    if(CD.falta){ toast('O Caderninho liga quando o banco do Corre atualizar.'); return false; }
    const row = { titulo: String(o.titulo || '').slice(0, 300), dia: o.dia || null, hora: o.hora || null, lista: String(o.lista || '').slice(0, 40), prio: o.prio || 4, repete: o.repete || '', ...(o.cada > 1 && UNID[o.repete] ? { cada: o.cada } : {}), ...(o.antes && o.antes.length && o.hora ? { antes: o.antes.slice(0, 6).sort((a, b) => a - b) } : {}), ordem: Date.now() / 1e3 };
    if(pai){ row.pai = pai; row.dia = null; row.hora = null; row.repete = ''; row.lista = ''; delete row.cada; delete row.antes; }
    try{
      const r = await api.ins('corre_caderno', row);
      const t = (r && r[0]) || Object.assign({ id: C.rid(), feito: false }, row);
      CD.t.push(t);
      if(quieto) return t;
      if(!pai){
        /* o anotado foi pra outra aba: diz onde ficou */
        const onde = !t.dia ? 'Algum dia' : t.dia === hoje() ? '' : t.dia < hoje() ? 'Ficou pra trás' : diaTxt(t.dia);
        if(onde && !(CD.aba === 'prox' && t.dia > hoje()) && !(CD.aba === 'solta' && !t.dia)) toast(`Anotado pra ${onde === 'Algum dia' ? '"Algum dia"' : onde}${t.hora ? ' às ' + horaTxt(t.hora) : ''}.`);
        else if(t.hora && avisoLigado() === false) toast(`Anotado. Liga os avisos e o ${C.push && C.push.CEL === false ? 'computador' : 'celular'} te chama às ${horaTxt(t.hora)}.`, 4200);
      }
      repinta(); C.sinaisAtualiza && C.sinaisAtualiza();
      return t;
    }catch(e){ if(faltaTabela(e)){ CD.falta = true; repinta(); return false; } if(!quieto) toast(semCada(e) ? semCada(e) : C.errMsg(e)); else throw e; return false; }
  }
  /* site novo com o banco de antes da 4.20 (sem a coluna do "a cada") */
  const semCada = e => e && e.code === 'PGRST204' && /cada|antes|endereco|anexos/.test(e.message || '') ? 'O "a cada N dias" e os avisos de antes ligam quando o banco do Corre atualizar.' : '';
  const avisoLigado = () => C.push && C.push.estado ? C.push.estado() === 'ligado' : null;

  /* ---------- marcar feita (a que repete pula pro próximo dia dela) ---------- */
  async function feita(id){
    const t = CD.t.find(x => x.id === id); if(!t) return;
    const el = document.querySelector(`.cd-it[data-id="${CSS.escape(id)}"]`);
    let patch, msg = '';
    if(!t.feito && t.repete && t.dia){
      const nd = proximo(t.dia, t.repete, cadaDe(t)), hj = hoje();
      patch = { dia: nd, feitas: feitasDe(t).filter(d => d !== hj).concat(hj).slice(-400) };
      /* pra desfazer (o tique nas Feitas hoje): o dia de antes, guardado no aparelho só por hoje */
      lsJSet(K_VOLTA, id, { de: t.dia, em: hj });
    } else patch = { feito: !t.feito };
    /* o risco e o tique na hora (a lista se arruma logo depois) */
    if(el && !t.feito){ el.classList.add('saindo'); if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){} }
    const antes = Object.assign({}, t);
    Object.assign(t, patch, patch.feito ? { feito_em: new Date().toISOString() } : patch.feito === false ? { feito_em: null } : {});
    try{
      const r = await salvaRep(id, patch); if(r && r[0]) Object.assign(t, r[0], (r[0].feitas || !('feitas' in patch)) ? {} : { feitas: patch.feitas });
      /* a que repete: as subtarefas voltam a ficar por fazer */
      if(patch.dia){ const ss = subs(id).filter(s => s.feito); if(ss.length){ await Promise.all(ss.map(s => api.upd('corre_caderno', { id: s.id }, { feito: false }).catch(() => {}))); ss.forEach(s => { s.feito = false; s.feito_em = null; }); } }
    }catch(e){ Object.assign(t, antes); toast(C.errMsg(e)); repinta(); return; }
    /* v4.29: a tarefa feita (ou a que repete, marcada hoje) é trampo: o banco confere e paga a moedinha */
    if(C.trampo && (patch.dia || patch.feito)) C.trampo.ganha('caderno', id);
    setTimeout(() => { repinta(); C.sinaisAtualiza && C.sinaisAtualiza(); }, el && !antes.feito ? 380 : 0);
    if(patch.dia){
      const sq = seguidas(t), emDia = !doDia(hoje()).some(e => e.t === 'tarefa') && !atrasadas().some(e => e.t === 'tarefa');
      toast(`Feita${sq >= 2 ? `: ${sq} dias seguidos` : ''}. Volta ${diaTxt(t.dia)}${t.hora ? ' às ' + horaTxt(t.hora) : ''}.${emDia ? ' Caderninho em dia!' : ''}`);
    }
    else if(msg) toast(msg);
    else if(t.feito && !doDia(hoje()).some(e => e.t === 'tarefa') && !atrasadas().some(e => e.t === 'tarefa') && antes.dia === hoje()) toast('Caderninho em dia. Boa!');
  }

  /* v4.25: grava o dia e os dias feitos; banco sem a coluna "feitas", grava o resto e guarda os dias no aparelho */
  async function salvaRep(id, patch){
    if(!('feitas' in patch)) return api.upd('corre_caderno', { id }, patch);
    try{ const r = await api.upd('corre_caderno', { id }, patch); lsJSet(K_REP, id, null); return r; }
    catch(e){
      if(!(e && e.code === 'PGRST204' && /feitas/.test(e.message || ''))) throw e;
      const p2 = Object.assign({}, patch); delete p2.feitas;
      const r = await api.upd('corre_caderno', { id }, p2); lsJSet(K_REP, id, patch.feitas); return r;
    }
  }
  /* desfazer a que repete feita hoje: volta pro dia de antes e o dia de hoje sai das feitas */
  async function desfazRep(id){
    const t = CD.t.find(x => x.id === id); if(!t) return;
    const v = lsJ(K_VOLTA)[id], hj = hoje();
    if(!v || v.em !== hj || !v.de){ folha(id); toast('Pra ela voltar, muda o dia aqui.'); return; }
    const antes = { dia: t.dia, feitas: t.feitas }, fs = feitasDe(t).filter(d => d !== hj);
    t.dia = v.de; t.feitas = fs; repinta();
    try{ await salvaRep(id, { dia: v.de, feitas: fs }); lsJSet(K_VOLTA, id, null); }
    catch(e){ Object.assign(t, antes); toast(C.errMsg(e)); }
    repinta(); C.sinaisAtualiza && C.sinaisAtualiza();
  }

  /* ---------- a folha da tarefa ---------- */
  function folha(id){
    const t = CD.t.find(x => x.id === id); if(!t){ toast('Essa tarefa não tá mais no caderninho.'); return; }
    const ss = subs(id), hj = hoje(), L = listas();
    C.sheet(`<form class="cd-f" id="cd-f" data-id="${esc(id)}" autocomplete="off">
      <div class="cd-f-top"><button type="button" class="cd-ck p${t.prio || 4}" data-act="cd-feita-f" data-id="${esc(id)}" aria-pressed="${t.feito ? 'true' : 'false'}" aria-label="${t.feito ? 'Desmarcar' : 'Marcar feita'}"><i>${ico('check')}</i></button>
        <label class="sr-only" for="cd-f-t">Tarefa</label><textarea id="cd-f-t" name="titulo" rows="1" maxlength="300" required>${esc(t.titulo)}</textarea>
        <button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <label class="sr-only" for="cd-f-n">Nota</label><textarea id="cd-f-n" name="nota" rows="2" maxlength="2000" placeholder="Nota (o link, o endereço, o detalhe)">${esc(t.nota || '')}</textarea>
      <fieldset class="cd-f-g"><legend>Quando</legend>
        <div class="cd-f-atalhos">${[['Hoje', hj], ['Amanhã', soma(hj, 1)], ['Semana que vem', (() => { let x = soma(hj, 1); while(semana(x) !== 1) x = soma(x, 1); return x; })()], ['Sem dia', '']].map(([n, v]) => `<button type="button" class="cd-lst${(t.dia || '') === v ? ' on' : ''}" data-act="cd-f-dia" data-v="${v}">${n}</button>`).join('')}</div>
        <div class="cd-f-lin"><label><span>Dia</span><input type="date" name="dia" value="${esc(t.dia || '')}"></label><label><span>Hora</span><input type="time" name="hora" value="${esc(t.hora || '')}"></label>
          <label><span>Repetir</span><select name="repete">${Object.keys(REPETE).map(k => `<option value="${k}"${(t.repete || '') === k && !(cadaDe(t) > 1) ? ' selected' : ''}>${REPETE[k]}</option>`).join('')}<option value="cada"${cadaDe(t) > 1 && UNID[t.repete] ? ' selected' : ''}>A cada…</option></select></label></div>
        <div class="cd-f-cada"${cadaDe(t) > 1 && UNID[t.repete] ? '' : ' hidden'}><span>A cada</span><label class="sr-only" for="cd-f-cn">Quantos</label><input id="cd-f-cn" name="cada" type="number" inputmode="numeric" min="1" max="999" value="${cadaDe(t) > 1 ? cadaDe(t) : 2}">
          <label class="sr-only" for="cd-f-cu">Dias, semanas ou meses</label><select id="cd-f-cu" name="cadau">${Object.keys(UNID).map(k => `<option value="${k}"${(UNID[t.repete] ? t.repete : 'dia') === k ? ' selected' : ''}>${UNID[k][1]}</option>`).join('')}</select></div>
        <label class="switch sm cd-f-av"><input type="checkbox" name="avisa"${t.avisa !== false ? ' checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>Avisar na hora</b><small>${avisoLigado() === false ? `Os avisos tão desligados neste aparelho: liga em ${C.push && C.push.nome ? C.push.nome() : 'Avisos no celular'}.` : 'Só com hora marcada. Chega no celular e no computador que tiverem os avisos ligados.'}</small></span></label>
        <div class="cd-f-antes" role="group" aria-label="Avisar também antes"><span>E também:</span>${ANTES.map(([m, n]) => `<label class="cd-lst cd-ant"><input type="checkbox" name="antes" value="${m}"${Array.isArray(t.antes) && t.antes.includes(m) ? ' checked' : ''}>${esc(n)}</label>`).join('')}</div>
      </fieldset>
      <fieldset class="cd-f-g"><legend>Endereço</legend>
        <div class="cd-f-end"><label class="sr-only" for="cd-f-e">Endereço</label><input id="cd-f-e" name="endereco" maxlength="300" value="${esc(t.endereco || '')}" placeholder="Rua, número, bairro, cidade" autocomplete="street-address">
          <a class="btn sm cd-f-maps" id="cd-f-maps" target="_blank" rel="noopener" href="${t.endereco ? esc(mapsBusca(t.endereco)) : '#'}"${t.endereco ? '' : ' hidden'}>${ico('pin')} Ver no Maps</a>
          <a class="btn sm ghost cd-f-maps" id="cd-f-rota" target="_blank" rel="noopener" href="${t.endereco ? esc(mapsRota(t.endereco)) : '#'}"${t.endereco ? '' : ' hidden'}>Como chegar</a></div></fieldset>
      <fieldset class="cd-f-g"><legend>Arquivos${anexosDe(t).length ? ` <small class="num">${anexosDe(t).length}</small>` : ''}</legend>
        <ul class="cd-f-anx" id="cd-f-anx">${anexosDe(t).map(a => anexoHTML(a)).join('')}</ul>
        <div><button type="button" class="btn sm" data-act="cd-anexa" data-id="${esc(id)}"${anexosDe(t).length >= 10 ? ' disabled' : ''}>${ico('up')} Pôr arquivo</button> <small class="fine">PDF, foto, planilha, documento: até 20 MB, 10 por tarefa. Só você vê.</small></div></fieldset>
      <fieldset class="cd-f-g"><legend>Prioridade</legend><div class="cd-f-prio">${[1, 2, 3, 4].map(p => `<label class="p${p}"><input type="radio" name="prio" value="${p}"${(t.prio || 4) === p ? ' checked' : ''}><span>${p < 4 ? '!' + p : 'Sem'}</span></label>`).join('')}</div></fieldset>
      <label class="cd-f-ls"><span>Lista</span><input name="lista" maxlength="40" value="${esc(t.lista || '')}" placeholder="Trabalho, Casa, um cliente…" list="cd-f-lists"><datalist id="cd-f-lists">${L.map(l => `<option value="${esc(l)}">`).join('')}</datalist></label>
      <fieldset class="cd-f-g cd-f-sub"><legend>Subtarefas${ss.length ? ` <small class="num">${ss.filter(s => s.feito).length}/${ss.length}</small>` : ''}</legend>
        <ol class="cd-l" id="cd-f-subs">${ss.map(s => itTarefa(s)).join('')}</ol>
        <div class="cd-f-novo"><label class="sr-only" for="cd-f-s">Nova subtarefa</label><input id="cd-f-s" maxlength="300" placeholder="+ subtarefa (Enter)"><button type="button" class="btn sm" data-act="cd-sub-add">Pôr</button></div></fieldset>
      <div class="acts"><button type="submit" class="btn pri">Salvar</button>${!t.feito && C.bicho && C.bicho.tem('foco') ? `<button type="button" class="btn" data-act="cd-foco" data-id="${esc(id)}">${ico('clock')} Foco</button>` : ''}<button type="button" class="btn ghost cd-f-x" data-act="cd-apaga" data-id="${esc(id)}">${ico('trash')} Apagar</button></div>
      ${!t.feito && C.bicho && C.bicho.me() && !C.bicho.tem('foco') ? `<p class="fine cd-f-tranca">${ico('lock')} Modo foco: ${esc(C.bicho.nome())} aprende com ${C.bicho.MARCOS.find(m => m.poder === 'foco').xp.toLocaleString('pt-BR')} tarefas.</p>` : ''}
    </form>`, 'cd-folhinha');
    const f = $('cd-f'); if(!f) return;
    const tt = $('cd-f-t'), cresce = () => { tt.style.height = 'auto'; tt.style.height = tt.scrollHeight + 'px'; };
    tt.addEventListener('input', cresce); setTimeout(cresce, 0);
    tt.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } });
    f.addEventListener('submit', e => { e.preventDefault(); salva(f); });
    const si = $('cd-f-s'); if(si) si.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); subAdd(); } });
    /* mexeu no dia à mão: os atalhos acendem certo */
    /* o botão do Maps acompanha o que tá escrito */
    f.endereco.addEventListener('input', () => { const v = f.endereco.value.trim(), a = $('cd-f-maps'), b = $('cd-f-rota'); [a, b].forEach(x => { if(x) x.hidden = !v; }); if(a) a.href = v ? mapsBusca(v) : '#'; if(b) b.href = v ? mapsRota(v) : '#'; });
    f.repete.addEventListener('change', () => { const c = f.querySelector('.cd-f-cada'); if(c){ c.hidden = f.repete.value !== 'cada'; if(!c.hidden) f.cada.focus(); } });
    f.dia.addEventListener('input', () => f.querySelectorAll('.cd-f-atalhos .cd-lst').forEach(b => b.classList.toggle('on', b.dataset.v === f.dia.value)));
  }
  const anexoHTML = a => `<li data-p="${esc(a.p)}"><button type="button" class="cd-anx" data-act="cd-anexo-abre" data-p="${esc(a.p)}">${ico(/^image\//.test(a.t || '') ? 'img' : 'save')}<span><b>${esc(a.n)}</b>${a.s ? `<small>${esc(tam(a.s))}</small>` : ''}</span></button><button type="button" class="cbtn plain" data-act="cd-anexo-tira" data-p="${esc(a.p)}" aria-label="Tirar ${esc(a.n)}">${ico('x')}</button></li>`;
  async function anexa(id){
    const t = CD.t.find(x => x.id === id); if(!t || !C.api.anexo) return;
    if(anexosDe(t).length >= 10){ toast('Cabem 10 arquivos por tarefa.'); return; }
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true;
    i.addEventListener('change', async () => {
      const fs = [...(i.files || [])].slice(0, 10 - anexosDe(t).length); i.remove(); if(!fs.length) return;
      const grandes = fs.filter(f => f.size > ANEXO_MAX); if(grandes.length) toast(`${grandes[0].name}: passa de 20 MB.`);
      const ok = fs.filter(f => f.size <= ANEXO_MAX); if(!ok.length) return;
      const ul = $('cd-f-anx'); if(ul) ul.insertAdjacentHTML('beforeend', `<li class="cd-anx-sub"><small>Subindo ${ok.length === 1 ? esc(ok[0].name) : ok.length + ' arquivos'}…</small></li>`);
      const novos = [];
      for(const f of ok){ try{ const p = await C.api.anexo.sobe(f); novos.push({ p, n: String(f.name || 'arquivo').slice(0, 120), t: String(f.type || '').slice(0, 80), s: f.size }); }catch(e){ toast(C.errMsg(e, 'Não deu pra subir ' + f.name + '.')); } }
      if(!novos.length){ const s1 = document.querySelector('.cd-anx-sub'); if(s1) s1.remove(); return; }
      const lista = anexosDe(t).concat(novos);
      try{ const r = await api.upd('corre_caderno', { id }, { anexos: lista }); t.anexos = (r && r[0] && r[0].anexos) || lista; }
      catch(e){ novos.forEach(a => C.api.anexo.tira(a.p)); toast(semCada(e) ? 'Os arquivos ligam quando o banco do Corre atualizar.' : C.errMsg(e)); }
      const s2 = document.querySelector('.cd-anx-sub'); if(s2) s2.remove();
      const ul2 = $('cd-f-anx'); if(ul2) ul2.innerHTML = anexosDe(t).map(anexoHTML).join('');
      repintaFundo();
    });
    document.body.appendChild(i); i.click();
  }
  /* a lista atrás da folha, sem fechar a folha */
  function repintaFundo(){ const c = $('cd-corpo'); if(c) c.innerHTML = corpo(); }
  async function salva(f){
    const id = f.dataset.id, t = CD.t.find(x => x.id === id); if(!t) return;
    const titulo = f.titulo.value.trim(); if(!titulo){ f.titulo.focus(); return; }
    const dia = f.dia.value || null, hora = dia ? (f.hora.value || null) : null, per = f.repete.value === 'cada';
    let repete = dia ? (per ? f.cadau.value : f.repete.value) : '', cada = per ? Math.round(Number(f.cada.value)) : 1;
    const antes = hora ? [...f.querySelectorAll('[name=antes]:checked')].map(i => Number(i.value)).filter(m => ANTES_OK.includes(m)).sort((a, b) => a - b) : [];
    if(per && !(cada >= 1 && cada <= 999)){ toast('O "a cada" vai de 1 a 999.'); f.cada.focus(); return; }
    if(f.hora.value && !dia){ toast('Pra marcar hora, escolhe o dia.'); f.dia.focus(); return; }
    if(f.repete.value && !dia){ toast('Pra repetir, escolhe o dia de começar.'); f.dia.focus(); return; }
    const end = f.endereco.value.trim().slice(0, 300);
    const patch = { titulo: titulo.slice(0, 300), nota: f.nota.value.slice(0, 2000), ...(end || t.endereco ? { endereco: end } : {}), dia, hora, repete, ...(cada > 1 || cadaDe(t) > 1 ? { cada: repete && UNID[repete] ? cada : 1 } : {}), ...(antes.length || (Array.isArray(t.antes) && t.antes.length) ? { antes } : {}), prio: Number((f.querySelector('[name=prio]:checked') || {}).value) || 4, lista: f.lista.value.trim().slice(0, 40), avisa: f.avisa.checked };
    try{ const r = await api.upd('corre_caderno', { id }, patch); Object.assign(t, patch, (r && r[0]) || {}); }
    catch(e){ toast(semCada(e) || C.errMsg(e)); return; }
    C.closeSheet(); repinta(); C.sinaisAtualiza && C.sinaisAtualiza();
    toast('Guardado.');
  }
  async function subAdd(){
    const f = $('cd-f'), si = $('cd-f-s'); if(!f || !si) return;
    const v = si.value.trim(); if(!v) return;
    const t = await cria({ titulo: v }, f.dataset.id);
    if(t){ si.value = ''; const ol = $('cd-f-subs'); if(ol) ol.insertAdjacentHTML('beforeend', itTarefa(t)); contaSubs(); si.focus(); }
  }
  function contaSubs(){
    const f = $('cd-f'); if(!f) return; const ss = subs(f.dataset.id), lg = f.querySelector('.cd-f-sub legend');
    if(lg) lg.innerHTML = `Subtarefas${ss.length ? ` <small class="num">${ss.filter(s => s.feito).length}/${ss.length}</small>` : ''}`;
  }

  /* v4.20 · o reloginho da capa (o Thales: "coloca um reloginho também"): a hora de Brasília, com os dois pontos
     piscando; de minuto em minuto, se a hora virou o dia, o Caderninho se arruma sozinho */
  let relT = 0, relDia = '';
  function relogio(){
    clearInterval(relT); relDia = hoje();
    relT = setInterval(() => {
      const el = $('cd-relogio'); if(!el){ clearInterval(relT); return; }
      el.textContent = agoraHM();
      if(hoje() !== relDia){ relDia = hoje(); repinta(); }
    }, 1000);
  }
  /* ---------- a página ---------- */
  C.views.caderno = async (app, sub) => {
    document.title = 'Caderninho · Corre';
    const abre = /^t\/([0-9a-z-]{6,64})$/i.exec(sub || '');
    /* veio do aviso no celular (#/caderninho/t/ID): o endereço volta pro Caderninho e a tarefa abre por cima */
    if(abre){ try{ history.replaceState(null, '', location.pathname + location.search + '#/caderninho'); }catch(e){} CD.aba = 'hoje'; }
    const rota = C.rota;
    pinta(app); relogio();
    await carrega(!!abre);
    if(rota !== C.rota) return;
    repinta();
    if(abre) folha(abre[1]);
    else if(focoLe()) focoMostra();
    /* v4.34: o piloto automático olha agora (de hora em hora no máximo), em vez de esperar o relógio */
    if(C.piloto) C.piloto.talvez().then(repintar => { if(repintar && rota === C.rota) repinta(); }).catch(() => {});
  };
  /* (o menu e a Comanda: as tarefas de hoje e as que ficaram pra trás) */
  C.caderno.sinal = async () => {
    await carrega(false);
    if(CD.falta || !CD.ok) return null;
    const hj = hoje(), r = raiz().filter(t => !t.feito && t.dia && t.dia <= hj);
    return { hoje: r.filter(t => t.dia === hj).length, atras: r.filter(t => t.dia < hj).length };
  };
  C.caderno.chegou = () => { if($('cd')) carrega(true).then(repinta); };
  /* v4.34: o piloto lê a tarefa pra montar o botão que resolve */
  C.caderno.tarefa = id => CD.t.find(x => x.id === id) || null;
  /* v4.33: o "Fala com o Corre" anota de qualquer página (devolve a tarefa; erro sobe pra quem chamou) */
  C.caderno.anota = async o => { await carrega(); if(CD.falta) throw { message: 'caderno', hint: 'caderno' }; return cria(o, null, true); };

  Object.assign(C.acts, {
    'cd-aba': el => { const k = el.dataset.k; if(!ABAS.some(x => x[0] === k)) return; CD.aba = k; ls.set(K_ABA, k); repinta(); const b = document.querySelector(`.cd-aba[data-k="${k}"]`); if(b) b.focus(); },
    'cd-lista': el => { CD.lista = el.dataset.l || ''; ls.set(K_LISTA, CD.lista); repinta(); },
    'cd-feita': el => feita(el.dataset.id),
    'cd-desfaz-rep': el => desfazRep(el.dataset.id),
    'cd-feita-f': async el => { await feita(el.dataset.id); const t = CD.t.find(x => x.id === el.dataset.id); if(t){ el.setAttribute('aria-pressed', t.feito ? 'true' : 'false'); if(t.feito || t.repete) C.closeSheet(); } },
    'cd-abre': el => {
      const t = CD.t.find(x => x.id === el.dataset.id);
      /* dentro da folha, tocar na subtarefa marca ela (não abre outra folha por cima) */
      if(t && t.pai && el.closest('#cd-f')){ feita(t.id).then(() => { const li = el.closest('.cd-it'); if(li){ li.outerHTML = itTarefa(t); } contaSubs(); }); return; }
      folha(el.dataset.id);
    },
    'cd-nodia': el => {
      const i = $('cd-novo'); if(!i) return;
      const d = el.dataset.dia, txt = d === hoje() ? 'hoje' : d === soma(hoje(), 1) ? 'amanhã' : ddmm(d);
      if(!SEM(i.value).includes(SEM(txt))) i.value = (i.value.trim() + ' ' + txt).trim() + ' ';
      i.focus(); i.setSelectionRange(0, 0); mostraEntendi(); i.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    'cd-pra-hoje': async () => {
      const hj = hoje(), L = raiz().filter(t => !t.feito && t.dia && t.dia < hj && daLista(t));
      if(!L.length) return;
      try{ await Promise.all(L.map(t => api.upd('corre_caderno', { id: t.id }, { dia: hj }).then(() => { t.dia = hj; }))); }catch(e){ toast(C.errMsg(e)); }
      repinta(); C.sinaisAtualiza && C.sinaisAtualiza(); toast(L.length === 1 ? '1 tarefa veio pra hoje.' : `${L.length} tarefas vieram pra hoje.`);
    },
    'cd-f-dia': el => { const f = $('cd-f'); if(!f) return; f.dia.value = el.dataset.v; if(!el.dataset.v){ f.hora.value = ''; f.repete.value = ''; } f.querySelectorAll('.cd-f-atalhos .cd-lst').forEach(b => b.classList.toggle('on', b === el)); },
    'cd-sub-add': () => subAdd(),
    'cd-anexa': el => anexa(el.dataset.id),
    'cd-anexo-abre': async el => {
      /* a aba abre ainda no toque (senão o navegador barra) e o link assinado chega nela */
      const w = window.open('', '_blank');
      try{ const u = await C.api.anexo.link(el.dataset.p); if(!u) throw new Error('link'); if(w) w.location = u; else location.href = u; }
      catch(e){ if(w) w.close(); toast('Não deu pra abrir o arquivo agora.'); }
    },
    'cd-anexo-tira': async el => {
      const f = $('cd-f'), t = f && CD.t.find(x => x.id === f.dataset.id); if(!t) return;
      const a = anexosDe(t).find(x => x.p === el.dataset.p); if(!a) return;
      if(!(await C.confirma({ ico: 'trash', titulo: 'Tirar o arquivo?', texto: `"${esc(a.n)}" sai da tarefa e do Corre.`, sim: 'Tirar', nao: 'Deixa' }))) return;
      const lista = anexosDe(t).filter(x => x.p !== a.p);
      try{ await api.upd('corre_caderno', { id: t.id }, { anexos: lista }); t.anexos = lista; C.api.anexo.tira(a.p); }catch(e){ toast(C.errMsg(e)); return; }
      const ul = $('cd-f-anx'); if(ul) ul.innerHTML = lista.map(anexoHTML).join(''); repintaFundo();
    },
    'cd-apaga': async el => {
      const id = el.dataset.id, t = CD.t.find(x => x.id === id); if(!t) return;
      const n = subs(id).length;
      if(!(await C.confirma({ ico: 'trash', titulo: 'Apagar a tarefa?', texto: `"${esc(t.titulo.slice(0, 80))}"${n ? ` e ${n === 1 ? 'a subtarefa' : `as ${n} subtarefas`}` : ''} saem do caderninho.`, sim: 'Apagar', nao: 'Deixa' }))) return;
      try{ await api.del('corre_caderno', { id }); }catch(e){ toast(C.errMsg(e)); return; }
      if(C.api.anexo) CD.t.filter(x => x.id === id || x.pai === id).forEach(x => anexosDe(x).forEach(a => C.api.anexo.tira(a.p)));
      CD.t = CD.t.filter(x => x.id !== id && x.pai !== id); C.closeSheet(); repinta(); C.sinaisAtualiza && C.sinaisAtualiza(); toast('Apagada.');
    },
    'cd-rele': () => carrega(true).then(repinta),
    /* v4.30 */
    'cd-despeja': () => { const i = $('cd-novo'); despeja(i && i.value.trim() ? i.value.trim() + '\n' : ''); if(i) i.value = ''; mostraEntendi(); },
    'cd-sem': el => { CD.sem = Math.max(0, Math.min(8, CD.sem + Number(el.dataset.d || 0))); repinta(); const b = document.querySelector(`[data-act="cd-sem"][data-d="${el.dataset.d}"]`); if(b && !b.disabled) b.focus(); },
    'cd-mv': el => {
      const t = CD.t.find(x => x.id === el.dataset.id); if(!t) return;
      const hj = hoje(), d = Number(el.dataset.d) || 0, novo = !t.dia || t.dia < hj ? (d > 0 ? hj : null) : soma(t.dia, d);
      if(novo && novo < hj) return;
      if(novo) moveDia(t.id, novo, String(d));
    },
    'cd-faro-outra': el => { CD.pulei.add(el.dataset.id); repinta(); },
    'cd-foco': el => focoAbre(el.dataset.id),
    'cd-foco-fechei': async () => {
      const f = focoLe(); focoFecha(true); if(!f) return;
      const t = CD.t.find(x => x.id === f.id); if(t && !t.feito) await feita(t.id);
    },
    'cd-foco-pausa': () => { const f = focoLe(); if(!f) return; if(f.parou){ f.pausa = (f.pausa || 0) + (Date.now() - f.parou); f.parou = 0; } else f.parou = Date.now(); focoGrava(f); focoTique(); },
    'cd-foco-mais': () => { const f = focoLe(); if(!f) return; f.dur += 5 * 6e4; FC.tocou = false; const b = $('cd-foco'); if(b) b.classList.remove('fim'); const m = $('cd-foco-msg'); if(m) m.textContent = 'Mais 5. Bora.'; focoGrava(f); focoTique(); },
    'cd-foco-sai': () => focoFecha(true)
  });
  /* as feitas abertas ou fechadas ficam lembradas; e a tecla Q anota (como no Todoist), fora de campo */
  document.addEventListener('toggle', e => { const d = e.target; if(d && d.matches && d.matches('details[data-feitas]')) ls.set(K_FEITAS, d.open ? '1' : '0'); }, true);
  document.addEventListener('keydown', e => {
    if(e.key !== 'q' && e.key !== 'Q') return;
    if(e.ctrlKey || e.metaKey || e.altKey || !$('cd') || !$('sheet').hidden || e.target.closest('input, textarea, select, [contenteditable]')) return;
    const i = $('cd-novo'); if(i){ e.preventDefault(); i.focus(); }
  });
  /* as setas trocam de aba (o jeito das abas do Hórus) */
  document.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.cd-aba'); if(!b || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const i = ABAS.findIndex(x => x[0] === b.dataset.k), n = ABAS[(i + (e.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length][0];
    e.preventDefault(); C.acts['cd-aba']({ dataset: { k: n } });
  });
})();
