/* CORRE · FALA COM O CORRE (v4.33)
   O Thales pediu o Corre "mais smart, moderno, inteligente". A busca (a lupa, o "/" e o Ctrl+K) passou a entender
   pedido: "me lembra de ligar pro contador amanhã 15h", "agenda post da GP Burger sexta 18h", "põe o Bar do Zé no
   Hórus 43 99999-1234", "cobrar 1500 do João dia 30", "manda mensagem pro @fulano", "abre o funil", "quanto entrou
   esse mês?". Duas camadas: a primeira entende no próprio aparelho, na hora e sem mandar nada pra fora; o que ela não
   entende vai pra IA (a função imagem, acao "fala"), que só escolhe a ação e preenche os campos. Quem faz é sempre o
   app, e o que muda alguma coisa a pessoa vê antes (o item da busca diz o que vai acontecer; o da IA pede "Fazer").
   Os números (grana, clientes, posts) nunca vão pra IA: a pergunta volta como "qual número" e o app responde.
   Aqui também mora o "teu dia" do Início (o resumo do que fazer agora, com a barra de falar com o Corre em cima). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;
  const SEM = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hoje = () => C.hojeBR();
  const soma = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const diaTxt = iso => { if(!iso) return ''; const n = Math.round((Date.parse(iso + 'T12:00:00Z') - Date.parse(hoje() + 'T12:00:00Z')) / 864e5); if(n === 0) return 'hoje'; if(n === 1) return 'amanhã'; if(n === -1) return 'ontem'; return `${DIAS_C[new Date(iso + 'T12:00:00Z').getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`; };
  const horaTxt = h => { if(!h) return ''; const [a, b] = h.split(':'); return `${Number(a)}h${b === '00' ? '' : b}`; };
  const quando = (dia, hora) => [diaTxt(dia), hora ? 'às ' + horaTxt(hora) : ''].filter(Boolean).join(' ');
  const cap = s => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  /* "3 da tarde", "8 da noite" e "9 da manhã" viram "15h", "20h" e "9h" (o Caderninho entende "15h") */
  const horasFaladas = s => String(s || '').replace(/\b(\d{1,2})\s*(?:h\s*)?da (tarde|noite)\b/gi, (m, h) => `${Number(h) < 12 ? Number(h) + 12 : h}h`)
    .replace(/\b(\d{1,2})\s*(?:h\s*)?da manh[aã]\b/gi, (m, h) => `${Number(h)}h`);
  /* dia e hora pelo jeito do Caderninho (o mesmo "amanhã 15h" que a pessoa já usa lá) */
  const tempo = s => C.caderno && C.caderno.entende ? C.caderno.entende(horasFaladas(s)) : { titulo: s, dia: null, hora: null, repete: '', cada: 1, antes: [] };

  /* ---------- as marcas da pessoa (pro "post da GP Burger"), lidas uma vez por abertura da busca ---------- */
  const MK = { uid: '', L: [], em: 0 };
  function marcas(){
    const u = C.uid() || '';
    if(MK.uid === u && Date.now() - MK.em < 6e4) return MK.L;
    MK.uid = u; MK.em = Date.now();
    MK.pr = u ? api.q('corre_portfolio', { select: 'id,marca,rede', eq: { dono: u }, limit: 60 }).then(L => { if(MK.uid === u) MK.L = (L || []).filter(m => m && m.marca); return MK.L; }).catch(() => MK.L) : Promise.resolve([]);
    return MK.L;
  }
  /* na hora de fazer, a lista tem que ter chegado (a busca pode ter sido mais rápida que o banco) */
  const marcasJa = async () => { const L = marcas(); return L.length ? L : await (MK.pr || Promise.resolve(L)); };
  /* a marca que aparece na frase (o nome inteiro, ou o @ dela), a mais comprida primeiro */
  function marcaNa(n){
    const L = marcas().slice().sort((a, b) => String(b.marca).length - String(a.marca).length);
    return L.find(m => { const nm = SEM(m.marca).trim(); return nm.length >= 2 && new RegExp('(^|[^a-z0-9])' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(n); })
      || L.find(m => m.rede && new RegExp('@' + SEM(m.rede).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(n)) || null;
  }

  /* ---------- dinheiro na frase: "R$ 1.500", "1500 reais", "1,5 mil", "2 mil", "800" ---------- */
  function valorDe(s){
    const n = SEM(s);
    let m = /(\d+(?:[.,]\d+)?)\s*mil\b/.exec(n);
    if(m) return { v: Math.round(parseFloat(m[1].replace(',', '.')) * 1000 * 100) / 100, txt: m[0] };
    m = /r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/.exec(n) || /\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:reais|real|conto|contos|pila|pilas)\b/.exec(n)
      || /(?:^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{2,6}(?:,\d{1,2})?)(?=\s|$|,)/.exec(n);
    if(!m) return null;
    const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    return v > 0 && v < 1e8 ? { v: Math.round(v * 100) / 100, txt: m[0].trim() } : null;
  }
  /* telefone e @ (pro cliente do Hórus) */
  const telDe = s => { const m = /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\s*\d{4}[-\s.]?\d{4}/.exec(String(s || '')); return m ? { d: m[0].replace(/\D/g, ''), txt: m[0] } : null; };
  const igDe = s => { const m = /@([A-Za-z0-9_.]{2,30})/.exec(String(s || '')); return m ? { h: m[1].replace(/\.$/, ''), txt: m[0] } : null; };
  /* tira um pedaço do texto (sem ligar pra acento: o índice do texto sem acento é o mesmo do original) */
  const tira = (s, re) => { const m = re.exec(SEM(s)); return m ? (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() : s; };
  const PREP = /^(?:d[oa]s?|de|pr[oa]s?|para (?:[oa]s?\s)?|para|ao?s?|com (?:[oa]s?\s)?|n[oa]s?)\s+/;
  const semPrep = s => { let t = String(s || '').trim(), x; while((x = PREP.exec(SEM(t)))) t = t.slice(x[0].length).trim(); return t; };

  /* ---------- as perguntas (o app responde com os números do aparelho) ---------- */
  const PERG = {
    entrou_mes: { t: () => `Quanto entrou em ${MES[Number(hoje().slice(5, 7)) - 1]}?`, h: '#/corre', i: 'grana' },
    a_receber: { t: () => 'Quanto tem pra receber?', h: '#/corre', i: 'grana' },
    vencidas: { t: () => 'Cobranças vencidas', h: '#/corre', i: 'recibo' },
    clientes_retornar: { t: () => 'Clientes pra chamar hoje', h: '#/horus', i: 'eye' },
    posts_hoje: { t: () => 'Posts de hoje', h: '#/studio', i: 'magia' },
    proximo_post: { t: () => 'O próximo post', h: '#/studio', i: 'clock' },
    tarefas_hoje: { t: () => 'Tarefas de hoje', h: '#/caderninho', i: 'caderno' },
    correal: { t: () => 'Teu correal', h: '', i: 'correal' },
    dia: { t: () => 'O teu dia', h: '#/', i: 'cal' }
  };
  /* quem começa pedindo pra fazer ("manda mensagem pro @x: bora fechar sexta?") não tá perguntando um número, mesmo com "?" */
  const ACAO = /^(?:manda|mande|mandar|envia|envie|enviar|escreve|escrever|fala com|chama|lembra|lembre|me lembra|anota|anote|agenda|agendar|programa|programar|cobra|cobrar|p[oõ]e|poe|coloca|bota|adiciona|cria|criar|faz|fazer|abre|abrir)\b/;
  function metricaDe(n){
    if(ACAO.test(n)) return '';
    const pergunta = /\?\s*$/.test(n) || /^(quanto|quantos|quantas|qto|qnto|qual|quais|o que|oque|que|como|cade|tem|tenho|me (diz|fala|mostra))\b/.test(n);
    if(!pergunta) return '';
    if(/\b(correal|correais|moeda)\b/.test(n)) return 'correal';
    if(/(a receber|pra receber|para receber|me devem|vou receber|tenho pra receber|falta receber)/.test(n)) return 'a_receber';
    if(/(vencid|atrasad|devendo|me deve|calote)/.test(n) && !/post/.test(n)) return 'vencidas';
    if(/\b(entrou|ganhei|faturei|recebi|faturamento|faturou|vendi|lucro|lucrei)\b/.test(n)) return 'entrou_mes';
    if(/\b(clientes?|leads?|retornar|responder)\b/.test(n)) return 'clientes_retornar';
    if(/\b(posts?|postage(m|ns)|stor(y|ies)|reels?)\b/.test(n)) return /(proximo|quando)/.test(n) ? 'proximo_post' : 'posts_hoje';
    if(/\b(tarefas?|afazeres|caderninho)\b/.test(n)) return 'tarefas_hoje';
    if(/(meu dia|hoje|agenda|resumo|o que (eu )?(tenho|tem|faco))/.test(n)) return 'dia';
    return '';
  }
  async function responde(k){
    const meses = MES[Number(hoje().slice(5, 7)) - 1];
    const S = C.sinaisDia ? C.sinaisDia() : { lista: [], prox: '' };
    if(k === 'entrou_mes'){
      const v = C.entrouNoMes ? await C.entrouNoMes() : 0;
      return v > 0 ? { t: `Entrou ${C.money(v)} em ${meses}.`, s: 'Pelo que tá lançado na Grana. Toca pra abrir.' } : { t: `Nada lançado como entrada em ${meses} ainda.`, s: 'Lança na Grana o que entrou. Toca pra abrir.' };
    }
    if(k === 'a_receber' || k === 'vencidas'){
      if(!C.negocio) return { t: 'As Vendas não abriram aqui.', s: '' };
      await C.negocio.carregar();
      const L = k === 'vencidas' ? C.negocio.vencidas() : C.negocio.aReceber(), tot = L.reduce((s, v) => s + (Number(C.negocio.falta(v)) || 0), 0);
      if(!L.length) return { t: k === 'vencidas' ? 'Nenhuma cobrança vencida.' : 'Nada pra receber agora.', s: 'Vendas e Grana. Toca pra abrir.' };
      return { t: k === 'vencidas' ? `${L.length === 1 ? '1 cobrança vencida' : L.length + ' cobranças vencidas'}: ${C.money(tot)}.` : `${C.money(tot)} pra receber${L.length > 1 ? ` de ${L.length} vendas` : ''}.`, s: L.slice(0, 3).map(v => v.cliente).filter(Boolean).join(', ') || 'Toca pra abrir.' };
    }
    if(k === 'correal'){
      if(C.correalCarrega) await C.correalCarrega().catch(() => null);
      return { t: `Tu tem ${C.correalTxt(C.correal.saldo || 0)}.`, s: 'A moeda do Correverso (não é dinheiro).' };
    }
    if(C.sinaisCarrega) await C.sinaisCarrega().catch(() => null);
    const S2 = C.sinaisDia ? C.sinaisDia() : S, ach = key => S2.lista.find(x => x.k === key);
    if(k === 'clientes_retornar'){ if(!C.ferr('horus')) return { t: 'O Hórus tá desligado.', s: 'Liga ele no teu perfil pra ter clientes pra chamar.' }; const x = ach('horus'); return { t: x ? x.txt + '.' : 'Ninguém pra chamar hoje.', s: 'Hórus. Toca pra abrir.' }; }
    if(k === 'posts_hoje'){ const x = ach('studio'); return { t: x ? x.txt + '.' : 'Nenhum post pra hoje.', s: S2.prox ? `O próximo: ${S2.prox}.` : 'Studio Cria. Toca pra abrir.' }; }
    if(k === 'proximo_post') return { t: S2.prox ? `O próximo post sai ${S2.prox}.` : 'Nenhum post programado.', s: 'Studio Cria. Toca pra abrir.' };
    if(k === 'tarefas_hoje'){ const x = ach('caderno'); return { t: x ? x.txt + '.' : 'Nenhuma tarefa pra hoje.', s: 'Caderninho. Toca pra abrir.' }; }
    const L = S2.lista;
    return { t: L.length ? L.map(x => x.txt).slice(0, 3).join(' · ') : 'Tudo em dia por aqui.', s: S2.prox ? `Próximo post: ${S2.prox}.` : '' };
  }

  /* ---------- entender (no aparelho) ---------- */
  /* devolve o pedido entendido, ou null. forte = começa com o jeito de pedir (Enter faz) */
  function entende(q){
    const s = String(q || '').replace(/\s+/g, ' ').trim(), n = SEM(s);
    if(s.length < 3 || /^[@#]/.test(s)) return null;
    /* a pergunta de um número */
    const mt = metricaDe(n);
    if(mt) return { k: 'pergunta', metrica: mt, forte: true };
    /* abrir uma parte do app */
    let m = /^(?:abre|abrir|abra|vai pr[oa]|ir pr[oa]|leva(?:r)? pr[oa]|me leva pr[oa]|mostra(?:r)?|entra(?:r)? n[oa]|quero ver)\s+(?:(?:o|a|os|as|meu|minha|meus|minhas)\s+)?(.+)$/.exec(n);
    if(m && C.procuraFerr){
      const alvo = m[1].trim(), F = C.procuraFerr().map(f => ({ f, n: notaF(alvo, f) })).filter(x => x.n).sort((a, b) => b.n - a.n);
      if(F.length) return { k: 'ir', f: F[0].f, forte: true };
    }
    /* mensagem pra alguém do Corre */
    m = /^(?:manda|mande|mandar|envia|envie|enviar|escreve|escrever)(?: uma)?(?: (?:msg|mensagem|zap|direct|dm))? (?:pr[oa]|para|ao?|pro @|pra @) ?@?([a-z0-9_.]{3,24})\b[,:]?\s*(?:(?:dizendo|falando|perguntando|que)\s+)?/.exec(n)
      || /^(?:fala|falar|chama|chamar) (?:com )?(?:o |a )?@([a-z0-9_.]{3,24})\b[,:]?\s*(?:(?:dizendo|falando|perguntando|que)\s+)?/.exec(n);
    if(m) return { k: 'mensagem', para: m[1].replace(/\.$/, ''), texto: s.slice(m.index + m[0].length).trim(), forte: true };
    /* um post no Studio */
    if(/\b(post|posts|postagem|story|stories|storie|reels?|carrossel)\b/.test(n) && /^(?:agenda|agendar|programa|programar|cria|criar|faz|fazer|marca|marcar|posta|postar|bota|coloca|monta|montar|novo|nova|um|uma|post|story|reels|carrossel)\b/.test(n)) return postDe(s, n);
    /* cliente no Hórus */
    m = /^(?:p[oõ]e|poe|coloca|bota|adiciona|salva|cadastra|inclui|joga)\s+(?:(?:o|a)\s+)?(.+?)\s+n[oa]\s+(?:h[oó]rus|horus|radar|funil|lista de clientes)\b(.*)$/i.exec(s) || /^(?:novo |nova )?(?:cliente|lead)[:\s]+(.+)$/i.exec(s);
    if(m) return clienteDe((m[1] + ' ' + (m[2] || '')).trim());
    /* cobrança ou orçamento (com um valor ou um cliente) */
    if(/^(?:cobra|cobrar|cobre|cobranca|lanca|lancar|registra|registrar|vendi|fechei|venda|orcamento|faz (?:um )?orcamento|fazer (?:um )?orcamento|monta (?:um )?orcamento|proposta)\b/.test(n)) { const c = cobrancaDe(s, n); if(c) return c; }
    /* tarefa */
    m = /^(?:me )?(?:lembra|lembre|lembrar|lembrete)(?: me)?(?: de| que| pra| para| d[oa])?\s+/.exec(n) || /^(?:anota|anote|anotar|tarefa|afazer|adiciona tarefa|nova tarefa|cria tarefa|criar tarefa|coloca na lista|bota na lista)[:\s]+/.exec(n)
      || /^(?:preciso|tenho que|tenho de|nao (?:posso )?esquecer(?: de)?|nao esquece(?: de)?)\s+/.exec(n);
    if(m) return tarefaDe(s.slice(m[0].length), true);
    /* fraca: começa com um verbo e diz quando ("ligar pro contador amanhã 15h") */
    if(/^[a-z]{3,}(?:ar|er|ir)\b/.test(n) && n.split(' ').length >= 2){ const t = tempo(s); if(t.dia || t.hora) return tarefaDe(s, false); }
    return null;
  }
  /* o mesmo jeito da busca: cada palavra tem que começar uma palavra do nome (3) ou do apelido (1) */
  function notaF(q, f){
    const P = x => SEM(x).split(/[^a-z0-9]+/).filter(Boolean), Q = P(q).filter(w => !['o', 'a', 'os', 'as', 'de', 'do', 'da', 'meu', 'minha'].includes(w)); if(!Q.length) return 0;
    const N = P(f.t), K = P(f.kw); let r = 0;
    for(const w of Q){ if(N.some(x => x.startsWith(w))) r += 3; else if(K.some(x => x.startsWith(w))) r += 1; else return 0; }
    return r;
  }
  function tarefaDe(resto, forte){
    const t = tempo(resto), titulo = cap(t.titulo.replace(/^(?:de|que|pra|para)\s+/i, ''));
    if(!titulo) return null;
    return { k: 'tarefa', o: Object.assign({}, t, { titulo }), forte };
  }
  function postDe(s, n){
    const t = tempo(s), mk = marcaNa(n);
    const formato = /\breels?\b/.test(n) ? 'reels' : /\bstor(y|ies|ie)\b/.test(n) ? 'story' : /\bcarrossel\b/.test(n) ? 'carrossel' : '';
    let r = t.titulo, tema = '';
    const sob = /\s(?:sobre|falando d[eoa]s?|com o tema|tema)\s+(.+)$/i.exec(r); if(sob){ tema = sob[1].trim().replace(/\s+(?:de|da|do|pra|pro|e|na|no)$/i, ''); r = r.slice(0, sob.index); }
    const tit = /["“]([^"”]{2,120})["”]/.exec(s);
    return { k: 'post', marca: mk, n, dia: t.dia, hora: t.hora, formato, tema: cap(tema), titulo: tit ? tit[1].trim() : '', forte: true };
  }
  function clienteDe(txt){
    let r = txt; const tel = telDe(r); if(tel) r = r.replace(tel.txt, ' ');
    const ig = igDe(r); if(ig) r = r.replace(ig.txt, ' ');
    r = r.replace(/\s+/g, ' ').replace(/[,;:\-]+\s*$/, '').trim();
    if(!r || r.length < 2) return null;
    return { k: 'cliente', nome: cap(r).slice(0, 120), tel: tel ? tel.d : '', ig: ig ? ig.h : '', forte: true };
  }
  function cobrancaDe(s, n){
    const orc = /\b(orcamento|proposta)\b/.test(n);
    const t = tempo(s);
    let r = t.titulo.replace(/^(?:cobra|cobrar|cobre|cobrança|cobranca|lança|lanca|lançar|lancar|registra|registrar|vendi|fechei|venda|orçamento|orcamento|faz (?:um )?or[cç]amento|fazer (?:um )?or[cç]amento|monta (?:um )?or[cç]amento|proposta)\b\s*/i, '');
    let desc = ''; const d = /\s(?:pel[oa]|referente a|ref\.?|por conta d[eoa])\s+(.+)$/i.exec(' ' + r); if(d){ desc = d[1].trim(); r = (' ' + r).slice(0, d.index).trim(); }
    const val = valorDe(r); if(val) r = tira(r, new RegExp('(?:de\\s+)?' + SEM(val.txt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const cli = semPrep(r.replace(/\b(?:no|na) valor\b/i, '').trim()).replace(/[,;:\-]+$/, '').trim();
    if(!val && !cli) return null;
    return { k: 'cobranca', tipo: orc ? 'orcamento' : 'cobranca', valor: val ? val.v : 0, cliente: cap(cli).slice(0, 120), vence: t.dia || '', desc: cap(desc).slice(0, 140), forte: true };
  }

  /* ---------- o que aparece na busca ---------- */
  const PEDE = /^(me |quanto|quantos|quantas|qual|quais|o que|como|cade|abre|abrir|vai|leva|mostra|agenda|programa|cria|criar|faz|fazer|anota|lembra|manda|envia|cobra|cobrar|p[oõ]e|coloca|bota|preciso|tenho que|quero)\b/;
  function linhaDe(z){
    if(!z) return null;
    if(z.k === 'pergunta'){ const P = PERG[z.metrica]; return { t: P.t(), s: 'Calculando…', i: P.i, h: P.h, calc: z.metrica }; }
    if(z.k === 'ir') return { t: `Abrir ${z.f.t}`, s: z.f.s || '', i: z.f.i || 'next', h: z.f.h || '' };
    if(z.k === 'tarefa'){ const q = quando(z.o.dia, z.o.hora); return { t: `Anotar: ${z.o.titulo}`, s: `Caderninho${q ? ' · ' + q : ' · sem dia'}${z.o.repete ? ' · repete' : ''}`, i: 'caderno' }; }
    if(z.k === 'post'){ const q = quando(z.dia, z.hora); return { t: `Post${z.formato ? ' (' + z.formato + ')' : ''}${z.marca ? ' da ' + z.marca.marca : ''}${q ? ' ' + q : ''}`, s: `Studio Cria: abre o editor já começado${z.tema ? ' · ' + z.tema : ''}`, i: 'magia' }; }
    if(z.k === 'cliente') return { t: `Pôr ${z.nome} no Hórus`, s: [z.tel ? C.horus && C.horus._ ? C.horus._.fmtTel(z.tel.replace(/^55/, '')) : z.tel : 'sem telefone ainda', z.ig ? '@' + z.ig : ''].filter(Boolean).join(' · '), i: 'eye' };
    if(z.k === 'cobranca') return { t: `${z.tipo === 'orcamento' ? 'Orçamento' : 'Cobrar'}${z.valor ? ' ' + C.money(z.valor) : ''}${z.cliente ? (z.tipo === 'orcamento' ? ' pra ' : ' de ') + z.cliente : ''}`, s: `Vendas: confere e salva${z.vence ? ' · vence ' + diaTxt(z.vence) : ''}${z.desc ? ' · ' + z.desc : ''}`, i: 'recibo' };
    if(z.k === 'mensagem') return { t: `Mensagem pra @${z.para}`, s: z.texto ? `"${z.texto.slice(0, 80)}" (você confere e manda)` : 'Abre a conversa', i: 'send' };
    return null;
  }
  /* os itens pra busca: o que o aparelho entendeu (Fazer) e o "Pedir pro Corre" (a IA). topo: a IA vem em cima */
  function itens(q){
    q = String(q || '').trim(); const out = { fazer: [], ia: null, topo: false };
    if(!st.me || q.length < 3 || /^[@#]/.test(q)) return out;
    marcas();
    const z = entende(q), l = linhaDe(z);
    if(l) out.fazer.push(Object.assign({ tipo: 'fz', key: 'fz:' + z.k, fz: z }, l));
    const n = SEM(q), palavras = n.split(/\s+/).filter(Boolean).length;
    if(palavras >= 2 && (!z || z.k === 'ir')) out.ia = { tipo: 'ia', key: 'ia', t: 'Pedir pro Corre', s: `"${q.slice(0, 90)}"`, i: 'magia', q };
    out.topo = !z && palavras >= 3 && PEDE.test(n);
    return out;
  }
  /* depois de desenhar a busca: as perguntas calculam e trocam o texto */
  function preenche(res){
    if(!res) return;
    res.querySelectorAll('[data-calc]').forEach(el => {
      if(el.dataset.calcFeito) return; el.dataset.calcFeito = '1';
      responde(el.dataset.calc).then(r => { const b = el.querySelector('b'), sm = el.querySelector('small'); if(b) b.textContent = r.t; if(sm) sm.textContent = r.s || ''; el.classList.add('pq-resp'); })
        .catch(() => { const sm = el.querySelector('small'); if(sm) sm.textContent = 'Não deu pra calcular agora.'; });
    });
  }

  /* ---------- fazer ---------- */
  const PEND = {};
  const pega = k => { const p = PEND[k]; delete PEND[k]; return p || null; };
  const espera = (sel, ms) => new Promise(ok => { const t0 = Date.now(); const f = () => { const el = document.querySelector(sel); if(el) return ok(el); if(Date.now() - t0 > (ms || 6000)) return ok(null); setTimeout(f, 120); }; f(); });
  const ir = h => { if(location.hash === h || (h === '#/' && !location.hash)) C.refresh(); else location.hash = h; };
  async function faz(z){
    if(z.k === 'ir'){ C.closeSheet(); if(z.f.h) ir(z.f.h); else if(z.f.a && C.acts[z.f.a]) C.acts[z.f.a](document.createElement('button')); return; }
    if(z.k === 'tarefa'){
      if(!C.caderno || !C.caderno.anota) return toast('O Caderninho não abriu aqui.');
      try{ const t = await C.caderno.anota(z.o); C.closeSheet(); toast(`Anotado no Caderninho: ${t.titulo}${t.dia ? ' · ' + quando(t.dia, t.hora) : ''}.`, 4200, '#/caderninho'); if(C.sinaisAtualiza) C.sinaisAtualiza(); }
      catch(e){ toast(e && e.hint === 'caderno' ? 'O Caderninho liga quando o banco do Corre atualizar.' : C.errMsg(e)); }
      return;
    }
    if(z.k === 'cliente'){
      const Z = C.horus && C.horus._; if(!Z) return toast('O Hórus não abriu aqui.');
      try{
        if(!C.ferr('horus')) await C.saveMe({ ferramentas: Object.assign({}, st.me.ferramentas || {}, { horus: true }) });
        const pr = Z.cfg().praca || {}, ph = z.tel ? Z.phoneOf(z.tel, pr.ddd) : null;
        await api.ins('corre_leads', { nome: z.nome, nicho: Z.guessNicho(z.nome) || '', bairro: '', tel: ph ? ph.fmt : '', wa: ph ? ph.wa : '', fixo: ph ? ph.fixo : '', insta: z.ig || '', cidade: String(pr.cidade || '').slice(0, 60), uf: pr.uf || '', st: 'novo', fonte: 'manual', hist: [{ t: new Date().toISOString(), k: 'cria', v: 'Fala com o Corre' }] });
        C.closeSheet(); toast(`${z.nome} tá no Hórus.`, 4200, '#/horus');
      }catch(e){ toast(C.errMsg(e, 'Não deu pra pôr no Hórus agora.')); }
      return;
    }
    if(z.k === 'cobranca'){
      if(!C.negocio) return toast('As Vendas não abriram aqui.');
      C.closeSheet(); ir('#/corre');
      await espera('#ng-corpo, .ng', 5000);
      C.negocio.editor(null, { cliente: z.cliente || '', st: z.tipo === 'orcamento' ? 'orcamento' : 'fechado', vence: z.vence || null, itens: z.valor ? [{ p: null, n: z.desc || 'Serviço', q: 1, v: z.valor, c: 0, u: '' }] : [] });
      return;
    }
    if(z.k === 'post'){
      /* o Studio só agenda pra marca com o @ (as sem @ ficam no Portfólio) */
      const L = (await marcasJa()).filter(m => m.rede);
      if(!L.length){ C.closeSheet(); ir('#/studio'); toast('Primeiro liga uma marca com o @ no Studio Cria; depois é só pedir o post.', 4200); return; }
      const mk = z.marca || (z.n ? marcaNa(z.n) : null);
      PEND.post = { marca_id: mk ? mk.id : '', dia: z.dia || '', hora: z.hora || '', formato: z.formato || '', tema: z.tema || '', titulo: z.titulo || '' };
      /* direto pra dentro do Studio (o #/studio sem nada é a porta, que não abre o editor) */
      C.closeSheet(); ir('#/studio/' + (mk && L.some(m => m.id === mk.id) ? mk.id : 'entrar'));
      return;
    }
    if(z.k === 'mensagem'){
      C.closeSheet(); ir('#/msg/@' + z.para);
      if(z.texto){ const el = await espera('#msg-txt', 6000); if(el && !el.disabled){ el.value = z.texto; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); toast('Confere a mensagem e manda.', 3000); } }
      return;
    }
  }

  /* ---------- a IA (o que o aparelho não entendeu) ---------- */
  /* a resposta da função vira o mesmo pedido de cima */
  function deIA(r){
    const k = r && r.acao;
    if(k === 'tarefa' && r.titulo) return { k, o: { titulo: cap(r.titulo), dia: r.dia || null, hora: r.hora || null, repete: r.repete || '', cada: 1, antes: [] } };
    if(k === 'post'){ marcas(); const mk = r.marca ? marcaNa(SEM(r.marca)) || MK.L.find(m => SEM(m.marca) === SEM(r.marca)) : null; return { k, marca: mk, dia: r.dia, hora: r.hora, formato: r.formato, tema: cap(r.tema), titulo: r.titulo }; }
    if(k === 'cliente' && r.nome) return { k, nome: cap(r.nome), tel: r.telefone || '', ig: r.instagram || '' };
    if(k === 'cobranca' && (r.valor || r.cliente)) return { k, tipo: r.tipo === 'orcamento' ? 'orcamento' : 'cobranca', valor: r.valor || 0, cliente: cap(r.cliente), vence: r.dia || '', desc: cap(r.descricao) };
    if(k === 'mensagem' && r.para) return { k, para: r.para, texto: r.texto || '' };
    if(k === 'ir' && r.destino && C.procuraFerr){
      const DEST = { inicio: 'inicio', studio: 'studio', horus: 'horus', caderno: 'caderno', corre: 'corre', mural: 'mural', msg: 'msg', grupos: 'grupos', verso: 'verso', houzi: 'houzi', marcas: 'marcas', planos: 'planos', perfil: 'perfil', avisos: 'avisos', banca: 'banca', linkbio: '' };
      if(r.destino === 'linkbio') return { k, f: { t: 'Link na bio', s: 'Tua página pra bio do Instagram', i: 'link', h: '#/linkbio' } };
      const f = C.procuraFerr().find(x => x.key === 'f:' + DEST[r.destino]); if(f) return { k, f };
    }
    if(k === 'pergunta' && PERG[r.metrica]) return { k, metrica: r.metrica };
    return null;
  }
  const EXEMPLOS = ['me lembra de ligar pro contador amanhã 15h', 'agenda um post sexta 18h sobre a promoção', 'quanto entrou esse mês?', 'põe o Bar do Zé no Hórus 43 99999-1234', 'cobrar 800 do João dia 30', 'o que eu tenho hoje?'];
  async function pensa(q, res){
    if(!res) return;
    const vez = (pensa.n = (pensa.n || 0) + 1);
    res.innerHTML = `<div class="fala-pensa" role="status"><span class="fala-orb" aria-hidden="true"><i></i><i></i><i></i></span><p><b>Pensando…</b><small>"${esc(q.slice(0, 120))}"</small></p></div>`;
    let r = null, erro = null;
    try{ r = await C.iaFn({ acao: 'fala', texto: q.slice(0, 400), marcas: marcas().map(m => m.marca).slice(0, 30) }, { auto: false }); }
    catch(e){ erro = e; }
    if(vez !== pensa.n || !res.isConnected) return;
    const volta = `<button type="button" class="btn" data-fala-volta>Voltar</button>`;
    if(erro){
      const c = erro.code || erro.erro || '';
      const msg = c === 'limite' ? 'Por hoje o Corre já pensou bastante. Amanhã volta; o que ele entende sozinho segue valendo.'
        : c === 'prompt' ? 'A IA do Fala com o Corre ainda tá chegando no servidor. O que o Corre entende sozinho já funciona.'
        : 'Não deu pra pensar agora. Tenta de novo daqui a pouco.';
      res.innerHTML = `<div class="fala-ok"><p class="fala-diz">${esc(msg)}</p><div class="acts">${c === 'limite' || c === 'prompt' ? '' : `<button type="button" class="btn pri" data-fala-de-novo>Tentar de novo</button>`}${volta}</div></div>`;
      return;
    }
    const z = deIA(r);
    if(!z){
      res.innerHTML = `<div class="fala-ok"><p class="fala-diz">${esc(r && r.resposta ? r.resposta : 'Não entendi esse. Dá pra pedir assim:')}</p>
        <div class="pq-chips fala-ex">${EXEMPLOS.map(x => `<button type="button" class="pq-chip" data-fala-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="acts">${volta}</div></div>`;
      return;
    }
    if(z.k === 'pergunta'){
      const P = PERG[z.metrica], a = await responde(z.metrica).catch(() => ({ t: 'Não deu pra calcular agora.', s: '' }));
      if(vez !== pensa.n || !res.isConnected) return;
      res.innerHTML = `<div class="fala-ok"><div class="fala-card fala-resp"><span class="pq-ic">${ico(P.i)}</span><span><b>${esc(a.t)}</b>${a.s ? `<small>${esc(a.s)}</small>` : ''}</span></div><div class="acts">${P.h ? `<a class="btn pri" href="${esc(P.h)}">Abrir</a>` : ''}${volta}</div></div>`;
      return;
    }
    const l = linhaDe(z);
    FZ.ia = z;
    res.innerHTML = `<div class="fala-ok">${r.resposta ? `<p class="fala-diz">${esc(r.resposta)}</p>` : ''}<div class="fala-card"><span class="pq-ic">${ico(l.i)}</span><span><b>${esc(l.t)}</b>${l.s ? `<small>${esc(l.s)}</small>` : ''}</span></div>
      <div class="acts"><button type="button" class="btn pri" data-fala-faz>${z.k === 'post' || z.k === 'cobranca' || z.k === 'mensagem' ? 'Abrir e conferir' : z.k === 'ir' ? 'Abrir' : 'Fazer'}</button>${volta}</div></div>`;
    const b = res.querySelector('[data-fala-faz]'); if(b) b.focus();
  }
  const FZ = { ia: null };
  /* um item da busca foi escolhido. Devolve true se a busca fica aberta (a IA pensando, a resposta) */
  function vai(o, res){
    if(o.tipo === 'ia'){ pensa(o.q, res); return true; }
    if(o.tipo === 'fz' && o.fz){
      if(o.fz.k === 'pergunta'){ if(!o.h){ return true; } return false; }
      faz(o.fz); return true;
    }
    return false;
  }
  /* os cliques dentro do resultado da IA (a busca entrega pra cá) */
  function clique(e, q, res, voltar){
    const t = e.target;
    if(t.closest('[data-fala-faz]')){ if(FZ.ia) faz(FZ.ia); return true; }
    if(t.closest('[data-fala-de-novo]')){ pensa(q, res); return true; }
    if(t.closest('[data-fala-volta]')){ voltar(); return true; }
    const ex = t.closest('[data-fala-ex]'); if(ex){ voltar(ex.dataset.falaEx); return true; }
    return false;
  }

  /* ---------- a voz (o ditado do próprio navegador; sem ele, o botão nem aparece) ---------- */
  const REC = window.SpeechRecognition || window.webkitSpeechRecognition;
  const temVoz = () => !!REC;
  let ouvindo = null;
  function ouve(inp, btn, fim){
    if(!REC || !inp) return;
    if(ouvindo){ try{ ouvindo.stop(); }catch(e){} return; }
    let r; try{ r = new REC(); }catch(e){ toast('O ditado não abriu neste navegador.'); return; }
    r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    const antes = inp.value; let ultimo = '';
    r.onresult = ev => { let t = ''; for(let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; ultimo = t; inp.value = t; inp.dispatchEvent(new Event('input', { bubbles: true })); };
    r.onerror = ev => { if(ev.error === 'not-allowed' || ev.error === 'service-not-allowed') toast('O Corre precisa da permissão do microfone pra ouvir.', 4200); else if(ev.error === 'no-speech') toast('Não ouvi nada. Toca e fala de novo.'); else if(ev.error === 'audio-capture') toast('Não achei o microfone do aparelho.'); else if(ev.error === 'network') toast('O ditado precisa de internet. Escreve que eu entendo também.', 4200); };
    r.onend = () => { ouvindo = null; if(btn){ btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); } if(!ultimo) inp.value = antes; inp.focus(); if(fim) fim(ultimo); };
    try{ r.start(); ouvindo = r; if(btn){ btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); } }catch(e){ ouvindo = null; }
  }
  const para = () => { if(ouvindo){ try{ ouvindo.abort(); }catch(e){} ouvindo = null; } };

  /* ---------- o "teu dia" no alto do Início ---------- */
  /* o dia guardado (o Corre instantâneo): os cartões de hoje aparecem na hora, e os de agora trocam por cima */
  const diaLe = () => { const o = C.guardado.le('dia'); return o && o.d === hoje() ? o : null; };
  const saudacao = () => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date())) % 24; return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
  const dataLonga = () => { const d = new Date(hoje() + 'T12:00:00Z'); return `${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getUTCDay()]}, ${d.getUTCDate()} de ${MES[d.getUTCMonth()]}`; };
  function cartoesHTML(o){
    if(!o) return `<div class="dia-cs" aria-hidden="true"><i class="dia-sk"></i><i class="dia-sk"></i></div>`;
    const L = o.lista || [];
    const cs = L.map(x => `<a class="dia-c dia-${esc(x.nivel)}" href="${esc(x.ir)}">${ico(x.i)}<span>${esc(x.txt)}</span>${ico('next', 'dia-ch')}</a>`);
    if(o.prox) cs.push(`<a class="dia-c dia-info" href="#/studio">${ico('clock')}<span>Próximo post: ${esc(o.prox)}</span>${ico('next', 'dia-ch')}</a>`);
    if(!L.length) return `<div class="dia-cs">${cs.join('')}<p class="dia-zero">${ico('check')}<span><b>Tudo em dia.</b> Nada esperando você agora.</span></p>
      <div class="dia-sug">${[['magia', 'Programar um post', '#/studio'], ['caderno', 'Anotar uma tarefa', ''], C.ferr('horus') ? ['eye', 'Chamar um cliente', '#/horus'] : ['tacha', 'Ver o Mural', '#/mural']].map(([i, t, h]) => h ? `<a class="chip" href="${h}">${ico(i)} ${t}</a>` : `<button type="button" class="chip" data-act="fala-abre" data-q="me lembra de ">${ico(i)} ${t}</button>`).join('')}</div></div>`;
    return `<div class="dia-cs">${cs.join('')}</div>`;
  }
  /* v5.09 (o Thales): a Banca do dia e o Do teu nicho moram aqui em cima, do lado do "ver meu perfil" (eram blocos e
     cartões embaixo, na casa do Studio): é onde a pessoa olha primeiro pra achar pauta */
  function dia(el){
    if(!el || !st.me) return;
    const ja = diaLe();
    const voz = temVoz() ? `<button type="button" class="fala-mic" data-act="fala-voz" aria-label="Falar com o Corre (ditar)" aria-pressed="false">${ico('mic')}</button>` : '';
    el.innerHTML = `<div class="dia-top"><h1><span class="hl">${saudacao()}, ${esc(C.firstName(st.me.nome))}.</span></h1><p class="dia-data">${esc(dataLonga())} · <a href="#/@${esc(st.me.handle)}">ver meu perfil</a> · <a href="#/banca">Banca do dia</a> · <a href="#/refs">Do teu nicho</a></p></div>
      <div class="fala-bar"><button type="button" class="fala-campo" data-act="fala-abre">${ico('magia', 'fala-ic')}<span class="fala-ph"><b>Fala com o Corre</b><span class="fala-roda" aria-hidden="true">"${esc(EXEMPLOS[0])}"</span></span></button>${voz}</div>
      <div id="dia-cards" aria-live="polite">${cartoesHTML(ja)}</div>`;
    rodaExemplos(el);
    if(!C.sinaisCarrega) return;
    C.sinaisCarrega().then(() => {
      const S = C.sinaisDia(), o = { d: hoje(), lista: S.lista, prox: S.prox };
      C.guardado.poe('dia', o);
      const box = $('dia-cards'); if(box && el.isConnected) box.innerHTML = cartoesHTML(o);
    }).catch(() => { const box = $('dia-cards'); if(box && !ja) box.innerHTML = cartoesHTML({ lista: [], prox: '' }); });
  }
  /* os exemplos da barra trocam devagar (parados com "menos movimento") */
  let rodaT = 0;
  function rodaExemplos(el){
    clearInterval(rodaT);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    rodaT = setInterval(() => {
      const r = el.querySelector('.fala-roda'); if(!r || !el.isConnected){ clearInterval(rodaT); return; }
      i = (i + 1) % EXEMPLOS.length; r.classList.add('sai');
      setTimeout(() => { r.textContent = `"${EXEMPLOS[i]}"`; r.classList.remove('sai'); }, 260);
    }, 4200);
  }
  Object.assign(C.acts, {
    'fala-abre': el => { if(C.procura) C.procura(el && el.dataset && el.dataset.q); },
    'fala-voz': () => { if(C.procura) C.procura('', { voz: true }); }
  });

  /* o demo (sem servidor): a "IA" de mentira entende tarefa com dia e responde o resto com os exemplos */
  function demo(texto){
    const t = tempo(texto), base = { acao: 'nada', titulo: '', dia: '', hora: '', repete: '', marca: '', formato: '', tema: '', nome: '', telefone: '', instagram: '', obs: '', cliente: '', valor: 0, descricao: '', tipo: '', para: '', texto: '', destino: '', metrica: '', resposta: 'Ainda não sei fazer isso. Dá pra pedir tarefa, post, cliente, cobrança, mensagem ou um número teu.' };
    if(t.dia || t.hora) return Object.assign(base, { acao: 'tarefa', titulo: cap(t.titulo.replace(/\b(nao pode passar|não pode passar|sem falta)\b/gi, '').trim()), dia: t.dia || '', hora: t.hora || '', resposta: `Anoto${t.dia ? ' pra ' + diaTxt(t.dia) : ''}${t.hora ? ' às ' + horaTxt(t.hora) : ''}.` });
    if(/fatur|grana|dinheiro/.test(SEM(texto))) return Object.assign(base, { acao: 'pergunta', metrica: 'entrou_mes', resposta: 'Olho o que entrou no mês.' });
    return base;
  }

  const cancela = () => { pensa.n = (pensa.n || 0) + 1; };
  C.fala = { entende, itens, preenche, vai, clique, pensa, cancela, faz, pega, temVoz, ouve, para, dia, demo, responde, EXEMPLOS, _: { valorDe, telDe, metricaDe, deIA, marcas: () => MK.L } };
})();
