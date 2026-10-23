/* CORRE · STUDIO · O MÊS DE UMA VEZ (v3.38).
   "Mês com IA": escolhe a marca, quantos posts, os dias e a hora; a IA monta a pauta (ou o Corre monta, com as datas que
   vendem no nicho), desenha cada arte com as referências da marca, escreve cada legenda e programa tudo no calendário.
   "Subir artes": as artes que você já tem entram na agenda na ordem, nos dias e na hora escolhidos; a IA escreve as legendas.
   Sem IA (limite do dia, sem crédito, função desligada), nada trava: a arte sai no modelo da marca e a legenda do modelo.
   O trabalho continua mesmo com a folha fechada: a barra em cima do calendário mostra o andamento. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], DOWL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const QTD = [[4, '1 por semana', [3]], [8, '2 por semana', [2, 4]], [12, '3 por semana', [1, 3, 5]], [16, '4 por semana', [1, 2, 4, 6]], [20, '5 por semana', [1, 2, 3, 4, 5]]];
  const MAX_SUBIR = 30;
  const isoUTC = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const msDe = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const curto = iso => { const d = new Date(msDe(iso)); return `${DOW[d.getUTCDay()]} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`; };
  const S = () => C.studio;
  /* o trabalho em andamento (um por vez) e o formulário aberto */
  let JOB = null, F = null;

  /* ---------- as vagas: os próximos dias escolhidos, sem repetir dia que a marca já tem post ---------- */
  function vagas(mk, n, dias, hora, inicio){
    const ocup = new Set(S().posts().filter(p => p.marca_id === mk.id && p.data && p.status !== 'ideia').map(p => p.data));
    const out = []; let d = msDe(inicio);
    for(let k = 0; k < 200 && out.length < n; k++, d += DAY){
      const iso = isoUTC(d), dow = new Date(d).getUTCDay();
      if(dias.includes(dow) && !ocup.has(iso) && S().quando(iso, hora) > Date.now() + 15 * 6e4) out.push(iso);
    }
    return out;
  }
  const horaDe = mk => { const c = {}; S().posts().filter(p => p.marca_id === mk.id && p.hora).forEach(p => { c[p.hora] = (c[p.hora] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top ? top[0] : '18:00'; };
  const amanha = () => isoUTC(Date.now() - 3 * 36e5 + DAY);

  /* ---------- a pauta sem IA: pilares de conteúdo + as datas que vendem no nicho + os assuntos que a pessoa escreveu ---------- */
  const catDe = mk => { const s = C.norm(`${mk.segmento || ''} ${mk.marca || ''}`);
    return /burg|lanch|pizz|comida|restaur|cafe|padar|doce|bolo|acai|confeit|bar\b|cerve|churras|sushi|marmit|delivery/.test(s) ? 'comida' : /beleza|salao|barb|estetic|unha|cabel|cilios|sobrancel|maquia/.test(s) ? 'beleza'
      : /tattoo|tatu/.test(s) ? 'tattoo' : /moda|roupa|loja|street|brecho|tenis|calcad/.test(s) ? 'moda' : /foto|video|filma|audiovis/.test(s) ? 'foto_video' : /evento|festa|buffet|casament/.test(s) ? 'eventos'
      : /musica|dj\b|banda|estudio de som|records/.test(s) ? 'musica' : /agencia|social|marketing|design|criativ/.test(s) ? 'social' : (C.st.me && C.st.me.categoria) || ''; };
  const PILARES = {
    Produto: [['O queridinho da casa', 'O mais pedido da semana', 'Feito do jeito certo', 'Esse aqui não tem erro'], s => `close do produto ou serviço principal da marca (${s}), bem iluminado, fundo simples e limpo`],
    Bastidor: [['Por trás do balcão', 'O que ninguém vê', 'Como a gente faz', 'Antes de chegar em você'], s => `bastidor do dia a dia da marca (${s}): mãos trabalhando, o processo, luz natural, sem rostos em destaque`],
    Dica: [['Guarda essa dica', 'Pouca gente sabe disso', 'Faz assim que dá certo', 'Um detalhe que muda tudo'], s => `detalhe de ${s} em close, composição limpa e didática`],
    Pergunta: [['E aí, qual é o teu?', 'Time A ou time B?', 'Qual você escolhe?', 'Conta pra gente'], s => `duas opções de ${s} lado a lado, bem iluminadas, para o público escolher`],
    Marca: [['Do nosso jeito', 'Quem faz acontecer', 'A casa é assim', 'Por que a gente existe'], s => `o espaço da marca (${s}), clima acolhedor, luz natural, sem pessoas posando`],
    Cliente: [['Pra quem não abre mão', 'Pra quem curte o detalhe', 'Pra quem tem pressa', 'Pra quem é exigente'], s => `pessoa aproveitando o produto ou serviço (${s}), momento real e espontâneo`],
    Chamada: [['Passa aqui', 'Chama no direct', 'Bora?', 'Te esperamos'], s => `fachada, vitrine ou balcão da marca (${s}), convidativo, fim de tarde`]
  };
  const ORDEM = ['Produto', 'Bastidor', 'Dica', 'Pergunta', 'Produto', 'Marca', 'Cliente', 'Chamada', 'Produto', 'Dica', 'Bastidor', 'Pergunta'];
  function pautaLocal(mk, datas, assunto){
    const seg = (mk.segmento || 'o negócio').toLowerCase(), r = C.rng(C.hash(mk.id + ':' + datas.join(',')));
    const temas = String(assunto || '').split(/[\n;,]+/).map(x => x.trim()).filter(x => x.length >= 3).slice(0, datas.length);
    const comerciais = C.refs && C.refs.proximas ? C.refs.proximas(catDe(mk), 12) : [];
    const it = datas.map((d, i) => { const t = ORDEM[i % ORDEM.length], [tit, cena] = PILARES[t]; return { data: d, tema: t, titulo: tit[(i + Math.floor(r() * 4)) % tit.length], cena: cena(seg) }; });
    /* a data que vende: o post que cai até 10 dias antes dela fala dela */
    comerciais.forEach(c => { const alvo = it.filter(x => x.data <= c.data && msDe(c.data) - msDe(x.data) <= 10 * DAY).pop(); if(alvo && !alvo.dataC){ Object.assign(alvo, { tema: 'Data', titulo: `${c.nome} tá chegando`.slice(0, 60), cena: `clima de ${c.nome.toLowerCase()} com o produto da marca (${seg}) em destaque`, dataC: c.nome }); } });
    /* os assuntos da pessoa entram espalhados pelo mês */
    temas.forEach((t, k) => { const i = Math.min(it.length - 1, Math.floor(k * it.length / temas.length)), x = it[i]; Object.assign(x, { tema: 'Assunto', titulo: (t[0].toUpperCase() + t.slice(1)).slice(0, 60), cena: `${t}, na marca ${mk.marca} (${seg})`, dataC: null }); });
    return it.map(x => ({ data: x.data, tema: x.tema, titulo: x.titulo, cena: x.cena }));
  }
  async function pautaIA(mk, datas, assunto, f){
    const ctx = { marca: mk.marca, segmento: mk.segmento || '', instagram: mk.rede || '', cidade: (C.st.me && C.st.me.cidade) || '', assunto: String(assunto || '').slice(0, 600),
      datas: datas.map(d => ({ data: d, dia: DOWL[new Date(msDe(d)).getUTCDay()] })), datas_comerciais: (C.refs && C.refs.proximas ? C.refs.proximas(catDe(mk), 12) : []).map(c => ({ nome: c.nome, data: c.data })),
      anteriores: S().posts().filter(p => p.marca_id === mk.id && p.titulo).slice(-12).map(p => p.titulo) };
    const r = await C.iaFn({ acao: 'pauta', ctx, marca_id: mk.id }, { oque: 'uma pauta' });
    /* a pauta paga entra na conta do mês (o "Usou X correal" do fim), já que a promessa da folha conta com ela */
    if(f && r && r.pago) f.pautaPago = (f.pautaPago || 0) + C.correalCent(r.pago);
    const L = (r && Array.isArray(r.itens) ? r.itens : []).filter(x => x && x.titulo);
    if(L.length < Math.ceil(datas.length / 2)) throw { code: 'pauta' };
    const base = pautaLocal(mk, datas, assunto);
    return datas.map((d, i) => { const x = L[i] || base[i]; return { data: d, tema: String(x.tema || base[i].tema).slice(0, 20), titulo: String(x.titulo).slice(0, 80), cena: String(x.cena || base[i].cena).slice(0, 300) }; });
  }

  /* ---------- a IA de imagem e de legenda (com reserva) ---------- */
  const b64Blob = (b64, mime) => { const bin = atob(b64), arr = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime || 'image/png' }); };
  function promptDe(mk, cena){
    const refs = Array.isArray(mk.refs) ? mk.refs.slice(0, 9) : [];
    return `Imagem para um post de Instagram da marca "${mk.marca}"${mk.segmento ? ` (${mk.segmento})` : ''}. Cena: ${cena}. Estilo: ${refs.length ? 'seguindo de perto o estilo visual das imagens de referência' : 'fotografia realista de publicidade, luz natural bonita, foco nítido, cores vivas'}.` +
      (refs.length ? ' Use as imagens de referência como guia de identidade visual da marca (paleta de cores, luz, enquadramento, textura e clima), sem copiar nenhuma delas e sem repetir os textos que aparecem nelas.' : '') +
      ' Formato vertical. Não escreva nenhum texto, letra, número ou logotipo na imagem. Deixe a parte de baixo mais limpa, porque ela vai receber um título.';
  }
  async function fotoFake(mk, semente){
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1536; const x = c.getContext('2d'), r = C.rng(C.hash(semente));
    const cores = [mk.cor || '#FFE800', '#FF48B0', '#0067AE', '#FF6C2F', '#141216'];
    x.fillStyle = cores[0]; x.fillRect(0, 0, 1024, 1536);
    for(let i = 0; i < 9; i++){ x.fillStyle = cores[1 + Math.floor(r() * 4)]; x.globalAlpha = .55 + r() * .4; x.beginPath(); x.arc(r() * 1024, r() * 1100, 120 + r() * 320, 0, 6.283); x.fill(); }
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', .9));
  }
  const juntar = l => [l.gancho, l.corpo, l.cta, l.tags].map(s => String(s || '').trim()).filter(Boolean).join('\n\n');
  const tagify = s => '#' + C.norm(s).replace(/[^a-z0-9]+/g, '');
  function legendaFake(mk, it){
    const CTAS = ['Salva pra não esquecer.', 'Manda pra quem precisa ver isso.', 'Comenta aqui embaixo.', 'Chama no direct.', 'Passa aqui.'];
    const tags = [tagify(mk.marca), mk.segmento ? tagify(mk.segmento) : '', C.st.me && C.st.me.cidade ? tagify(String(C.st.me.cidade).split(',')[0]) : ''].filter(t => t.length > 2).join(' ');
    return { gancho: it.titulo || '', corpo: `Na ${mk.marca}, isso aqui não é detalhe: é o jeito da casa.`, cta: CTAS[C.hash(it.titulo + it.data) % CTAS.length], tags, alt: it.titulo ? `Arte do post da ${mk.marca}: ${String(it.titulo).replace(/[.!?…\s]+$/, '')}.` : `Arte do post da ${mk.marca}.` };
  }
  /* "promo-de-sexta.jpg" vira "Promo de sexta"; nome de câmera, print ou WhatsApp não vira título */
  function nomeDoArquivo(f){
    const n = String((f && f.name) || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    if(n.length < 4 || !/\p{L}{3}/u.test(n) || /^(img|dsc|dcim|pxl|mvimg|photo|foto|image|imagem|screenshot|captura|whatsapp|wa\d|arte \d+$|ig |insta|post \d+$|untitled|sem titulo|design sem)/i.test(n) || /\d{6,}/.test(n.replace(/\s/g, ''))) return '';
    return (n[0].toUpperCase() + n.slice(1)).slice(0, 80);
  }
  const blobUrl = b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result || '')); fr.onerror = () => ok(''); fr.readAsDataURL(b); });

  /* ---------- o trabalho: cada item vira post programado ---------- */
  /* job.gastou é em centavos inteiros (v3.43: o correal tem centavos; somar 0,20 dez vezes em número quebrado não dá 2) */
  function novoJob(tipo, mk, itens, hora, o){ return Object.assign({ tipo, mk, itens: itens.map(x => Object.assign({ st: 'fila' }, x)), hora, i: 0, feitos: 0, falhas: 0, semIA: '', semLeg: false, fim: false, parar: false, iaImg: tipo === 'ia', iaLeg: true, usaCorreal: false, gastou: 0 }, o || {}); }
  async function roda(job){
    JOB = job; barra(); pinta();
    for(let i = 0; i < job.itens.length && !job.parar; i++){
      const it = job.itens[i]; job.i = i; it.st = 'indo'; barra(); pinta();
      try{ await umPost(job, it); it.st = 'ok'; job.feitos++; }
      catch(e){ it.st = 'erro'; it.erro = C.errMsg(e, 'Não deu pra criar esse.'); job.falhas++; }
      barra(); pinta();
      if(S().vivo()) S().recarrega();
    }
    job.fim = true; barra(); pinta();
    const L = job.itens.filter(x => x.st === 'ok');
    if(S().vivo()) await S().recarrega(L[0] && L[0].data);
    C.toast(job.parar ? `Parado: ${job.feitos} ${job.feitos === 1 ? 'post programado' : 'posts programados'}.` : `Pronto: ${job.feitos} ${job.feitos === 1 ? 'post programado' : 'posts programados'}${L.length ? `, de ${curto(L[0].data)} a ${curto(L[L.length - 1].data)}` : ''}.`, 5200);
  }
  async function umPost(job, it){
    const mk = job.mk;
    /* 1. a imagem */
    let foto = it.arquivo || null, fotoUrl = '';
    if(!foto && job.iaImg){
      try{ const r = await C.iaFn({ prompt: promptDe(mk, it.cena), refs: Array.isArray(mk.refs) ? mk.refs.slice(0, 9) : [], marca_id: mk.id }, { auto: !!job.usaCorreal }); foto = b64Blob(r.b64, r.mime); if(r.restam != null) job.restam = r.restam; if(r.pago) job.gastou += C.correalCent(r.pago); }
      catch(e){
        if(e && e.code === 'nofn' && C.DEMO) foto = await fotoFake(mk, it.titulo + it.data);
        else { job.iaImg = false; job.semIA = e && e.code === 'limite' ? 'limite' : (e && (/credit|quota|billing/i.test(String(e.detalhe || '')) || e.code === 'sem_credito')) ? 'credito' : 'off'; }
      }
    }
    if(foto) foto = await C.shrink(new File([foto], 'foto.jpg', { type: foto.type || 'image/jpeg' }), 1600, .88);
    /* 2. a arte (o modelo da marca: título em cima da foto; sem foto, o título na cor da marca). Arte subida vai como veio */
    let arte = null, desenho = null;
    if(job.tipo === 'subir'){ arte = foto; }
    else {
      if(foto) fotoUrl = await C.api.upload(foto);
      desenho = { modelo: foto ? 'capa' : (job.itens.indexOf(it) % 2 ? 'frase' : 'capa'), cor: mk.cor || '#FFE800', kicker: it.tema && !['Assunto', 'Data'].includes(it.tema) ? it.tema : '', titulo: it.titulo, texto: '', numero: '', foto: fotoUrl, logo: !!mk.logo_url, ia_d: it.cena, ia_e: Array.isArray(mk.refs) && mk.refs.length ? 'refs' : 'foto' };
      arte = await desenha(mk, desenho);
    }
    /* 3. a legenda (a IA lê a arte pronta) */
    let leg = null;
    if(job.iaLeg){
      try{
        const peq = await C.shrink(new File([arte], 'arte.jpg', { type: 'image/jpeg' }), 768, .8);
        leg = await C.iaFn({ acao: 'legenda', marca_id: mk.id, arte: await blobUrl(peq), ctx: { marca: mk.marca, segmento: mk.segmento || '', rede: mk.rede || '', cidade: (C.st.me && C.st.me.cidade) || '', modelo: desenho ? desenho.modelo : 'imagem', kicker: desenho ? desenho.kicker : '', titulo: it.titulo || '', texto: '', numero: '', cena: it.cena || '', tema: it.tema || '', data: it.data, anteriores: [] } }, { auto: !!job.usaCorreal });
        if(leg && leg.pago) job.gastou += C.correalCent(leg.pago);
      }catch(e){ if(!(e && e.code === 'nofn' && C.DEMO)) { job.iaLeg = false; job.semLeg = e && e.code === 'limite' ? 'limite' : true; } }
    }
    if(!leg || !(leg.gancho || leg.corpo)) leg = legendaFake(mk, it);
    /* 4. sobe a arte e programa */
    const midia = await C.api.upload(arte);
    const lg = { gancho: leg.gancho || '', corpo: leg.corpo || '', cta: leg.cta || '', tags: leg.tags || '' };
    const row = { marca_id: mk.id, data: it.data, hora: job.hora, tema: String(it.tema || '').slice(0, 40), titulo: String(it.titulo || leg.gancho || (it.n ? `Arte ${it.n}` : '')).slice(0, 140), legenda: juntar(lg).slice(0, 2200), alt: String(leg.alt || '').slice(0, 1000),
      midia_url: midia, status: 'pronto', ig_status: 'agendado', ig_quando: S().igQuando(it.data, job.hora), ig_conta: job.conta || null, arte: desenho ? Object.assign({}, desenho, { leg: lg }) : { modelo: 'subida', foto: midia, cor: mk.cor || '#FFE800', logo: false, leg: lg } };
    const r = await C.api.ins('corre_posts', row);
    it.post = r && r[0]; it.thumb = URL.createObjectURL(arte);
    /* v4.29: cada post programado do mês é trampo (a moedinha sobe e o teto do dia segura) */
    if(it.post && C.trampo) C.trampo.ganha('post', it.post.id);
  }
  /* desenha a arte no modelo da marca (o mesmo do editor); se o logo bloquear a exportação, sai sem o logo */
  async function desenha(mk, d){
    const cv = document.createElement('canvas'), dados = Object.assign({}, d, { marca: mk.marca, rede: mk.rede, logo_url: mk.logo_url });
    const tenta = async a => { await C.estudioRender(cv, a); return await new Promise((ok, falha) => { try{ cv.toBlob(b => b ? ok(b) : falha({ code: 'blob' }), 'image/jpeg', .9); }catch(e){ falha(e); } }); };
    try{ return await tenta(dados); }catch(e){ d.logo = false; return await tenta(Object.assign({}, dados, { logo: false })); }
  }

  /* ---------- a barra do andamento (em cima do calendário) ---------- */
  function barra(){
    const b = C.$('lt-barra'); if(!b) return;
    if(!JOB || (JOB.fim && JOB.visto)){ b.hidden = true; b.innerHTML = ''; return; }
    const n = JOB.itens.length, ok = JOB.feitos, at = JOB.itens[JOB.i];
    b.hidden = false;
    b.innerHTML = `<div class="lt-b-tx">${ico(JOB.fim ? 'check' : 'magia')}<span>${JOB.fim ? `<b>${ok} ${ok === 1 ? 'post programado' : 'posts programados'}</b> pra ${esc(JOB.mk.marca)}${JOB.falhas ? ` · ${JOB.falhas} não deu` : ''}.` : `<b>${JOB.tipo === 'ia' ? 'A IA tá fazendo o mês' : 'Programando as artes'}</b> da ${esc(JOB.mk.marca)}: ${ok} de ${n}${at ? ` · ${esc(at.titulo || 'arte ' + (JOB.i + 1))}` : ''}`}</span></div>
      <div class="lt-b-bar" aria-hidden="true"><i style="width:${Math.round((ok + JOB.falhas) / Math.max(1, n) * 100)}%"></i></div>
      <div class="lt-b-acts"><button type="button" class="btn sm" data-act="lt-ver">${JOB.fim ? 'Ver o resumo' : 'Ver'}</button>${JOB.fim ? '<button type="button" class="btn sm ghost" data-act="lt-ok">Fechar</button>' : ''}</div>`;
  }
  /* a folha do trabalho (as artes aparecendo uma a uma) */
  function pinta(){
    const box = C.$('lt-corpo'); if(!box || !JOB || F) return;
    const n = JOB.itens.length, avisos = [];
    if(JOB.semIA === 'limite') avisos.push(JOB.usaCorreal ? 'Acabou o grátis de imagem de hoje e o correal não deu pra mais: as próximas artes saem no modelo da marca, sem foto (dá pra gerar a foto depois, no Editar).' : 'Acabou o grátis de imagem de hoje: as próximas artes saem no modelo da marca, sem foto. Com correal dá pra continuar (liga o "usar correal" no próximo mês) ou gera a foto depois, no Editar.');
    else if(JOB.semIA === 'credito') avisos.push('A IA do Corre ficou sem crédito: as próximas artes saem no modelo da marca, sem foto.');
    else if(JOB.semIA === 'off') avisos.push('A IA de imagem tá temporariamente indisponível: as artes saem no modelo da marca, sem foto.');
    if(JOB.semLeg === 'limite') avisos.push('Acabou o grátis de legenda de hoje: as próximas saem de um modelo pronto (dá pra trocar no Editar).');
    else if(JOB.semLeg) avisos.push('A IA de legenda não respondeu: as legendas saem de um modelo pronto (dá pra trocar no Editar).');
    box.innerHTML = `<div class="lt-run">
      <p class="lt-st">${JOB.fim ? `<b>${JOB.feitos} ${JOB.feitos === 1 ? 'post programado' : 'posts programados'}.</b> ${JOB.feitos ? 'Já tão no calendário, cada um no seu dia.' : ''}${JOB.gastou ? ` Usou ${C.correalTxt(JOB.gastou / 100)}.` : ''}` : `${JOB.tipo === 'ia' ? 'Desenhando' : 'Programando'} ${Math.min(n, JOB.feitos + JOB.falhas + 1)} de ${n}… ${JOB.tipo === 'ia' ? 'Cada arte leva uns 20 segundos.' : ''} Pode fechar: continua aqui em cima do calendário.`}</p>
      <div class="lt-b-bar" aria-hidden="true"><i style="width:${Math.round((JOB.feitos + JOB.falhas) / Math.max(1, n) * 100)}%"></i></div>
      ${avisos.map(a => `<p class="lt-aviso">${esc(a)}</p>`).join('')}
      <ol class="lt-grade">${JOB.itens.map(x => `<li class="lt-t ${x.st}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : x.st === 'indo' ? '<span class="lt-sk"></span>' : x.st === 'erro' ? `<span class="lt-x">${ico('x')}</span>` : '<span class="lt-sk off"></span>'}<span class="lt-tl"><b class="num">${esc(curto(x.data))}</b>${esc(x.titulo || '')}</span>${x.erro ? `<small class="lt-e">${esc(x.erro)}</small>` : ''}</li>`).join('')}</ol>
      <div class="acts">${JOB.fim ? `<button type="button" class="btn pri" data-act="lt-calendario">Ver no calendário</button>` : `<button type="button" class="btn" data-close>Fechar (continua)</button><button type="button" class="btn ghost" data-act="lt-parar">Parar</button>`}</div>
    </div>`;
  }

  /* ---------- as folhas ---------- */
  const marcaPadrao = () => S().marcaAtual() || S().marcas()[0];
  /* v3.40: em qual conta o mês sai (a conectada com o @ da marca, à vista; sem ela, a pessoa escolhe) */
  const contaPadrao = mk => ((C.ig && C.ig.daMarca(mk)) || {}).id || '';
  const qtdPadrao = 12;
  function mkChips(sel){
    const L = S().marcas(); if(L.length < 2) return '';
    return `<div class="lt-mks" role="radiogroup" aria-label="Marca">${L.map(m => `<button type="button" class="st-mk" role="radio" data-act="lt-mk" data-id="${m.id}" aria-checked="${m.id === sel.id}">${C.marcaLogo(m, 's')}<span><b>${esc(m.marca)}</b><small>@${esc(m.rede)}</small></span></button>`).join('')}</div>`;
  }
  function agendaHTML(){
    return `<div class="lt-agenda">
      ${F.tipo === 'ia' ? `<fieldset class="lt-f"><legend>Quantos posts</legend><div class="lt-qtd" role="radiogroup">${QTD.map(([n, t]) => `<button type="button" role="radio" data-act="lt-qtd" data-n="${n}" aria-checked="${F.n === n}"><b class="num">${n}</b><small>${t}</small></button>`).join('')}</div></fieldset>` : ''}
      <fieldset class="lt-f"><legend>Em quais dias</legend><div class="lt-dias">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" data-act="lt-dia" data-d="${d}" aria-pressed="${F.dias.includes(d)}">${DOW[d]}</button>`).join('')}</div></fieldset>
      <div class="row2"><div class="fld"><label for="lt-hora">Que horas</label><input class="inp" id="lt-hora" type="time" value="${esc(F.hora)}"></div><div class="fld"><label for="lt-ini">A partir de</label><input class="inp" id="lt-ini" type="date" min="${amanha()}" value="${esc(F.ini)}"></div></div>
      <p class="fine" id="lt-resumo"></p>
      <div class="lt-cota" id="lt-cota">${cotaHTML()}</div>
    </div>`;
  }
  /* quanto do grátis de hoje sobra, o que o mês precisa e o correal (só gasta com o "usar correal" ligado).
     v3.43: o correal tem centavos; preço, custo e saldo são contados em centavos inteiros e escritos com vírgula */
  /* quanto o saldo cobre do que passa do grátis, na ordem em que o mês gasta: a pauta (no Mês com IA) e depois, post a
     post, a imagem e a legenda. Igual ao trabalho (umPost): a primeira imagem que o correal não cobre desliga a IA de
     imagem do resto do mês, e o mesmo com a legenda. Sem as cotas (sem a função), só dá pra dizer quanto o saldo paga */
  function cobre(saldoC, n, livImg, livLeg, ia, iaLeg, P){
    const pi = C.correalCent(P.imagem), pl = C.correalCent(P.legenda);
    let s = saldoC, img = 0, leg = 0, li = livImg, ll = livLeg, comImg = ia, comLeg = ia || iaLeg;
    const paga = p => { if(p > 0 && s >= p){ s -= p; return true; } return false; };
    if(ia){ if(ll > 0) ll--; else if(paga(pl)) leg++; }
    for(let i = 0; i < n; i++){
      if(comImg){ if(li > 0) li--; else if(paga(pi)) img++; else comImg = false; }
      if(comLeg){ if(ll > 0) ll--; else if(paga(pl)) leg++; else comLeg = false; }
    }
    return { img, leg };
  }
  const qts = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  function cotaHTML(){
    if(!F) return '';
    const c = F.cotas, w = C.correal, P = w.precos, ia = F.tipo === 'ia', n = ia ? F.n : F.arqs.length, Fm = C.correalFmt;
    const precImg = ia ? n : 0, precLeg = ia ? n + 1 : (F.iaLeg ? n : 0);
    const livImg = c && c.imagem ? Math.max(0, c.imagem.lim - c.imagem.usados) : null, livLeg = c && c.legenda ? Math.max(0, c.legenda.lim - c.legenda.usados) : null;
    const xImg = livImg == null ? 0 : Math.max(0, precImg - livImg), xLeg = livLeg == null ? 0 : Math.max(0, precLeg - livLeg);
    const custo = xImg * C.correalCent(P.imagem) + xLeg * C.correalCent(P.legenda);
    const saldo = w.saldo == null ? null : C.correalCent(w.saldo);
    const linha = c ? (xImg || xLeg ? `Hoje sobram <b>${livImg}</b> ${livImg === 1 ? 'imagem grátis' : 'imagens grátis'}${precLeg ? ` e <b>${livLeg}</b> ${livLeg === 1 ? 'legenda' : 'legendas'}` : ''}. Pro que falta (${[xImg ? qts(xImg, 'imagem', 'imagens') : '', xLeg ? qts(xLeg, 'legenda', 'legendas') : ''].filter(Boolean).join(' e ')}): <b>${C.correalTxt(custo / 100)}</b>.` : `O grátis de hoje dá pro mês inteiro${ia ? ` (sobram ${livImg} imagens)` : ''}.`) : '';
    if(c && !xImg && !xLeg) return `<p class="lt-cota-l">${ico('check')} ${linha}</p>`;
    let alcance = '';
    if(saldo != null && c){
      if(custo <= saldo) alcance = '. O saldo cobre tudo.';
      else {
        const k = cobre(saldo, n, livImg, livLeg, ia, F.iaLeg, P);
        /* o "sem foto" só quando falta imagem de verdade; faltando só legenda, a foto sai e a legenda vem do modelo pronto */
        const faltaImg = xImg > k.img, faltaLeg = xLeg > k.leg;
        const resto = faltaImg && faltaLeg ? 'as imagens que passarem saem no modelo da marca, sem foto, e as legendas, de um modelo pronto'
          : faltaImg ? 'o que passar sai no modelo da marca, sem foto' : 'as legendas que passarem saem de um modelo pronto';
        alcance = `. Não dá pra tudo: o saldo cobre ${[xImg ? `${k.img} de ${qts(xImg, 'imagem', 'imagens')}` : '', xLeg ? `${k.leg} de ${qts(xLeg, 'legenda', 'legendas')}` : ''].filter(Boolean).join(' e ')}; ${resto}.`;
      }
    } else if(saldo != null){
      /* sem as cotas: quanto o saldo paga, de cada coisa */
      const pi = C.correalCent(P.imagem), pl = C.correalCent(P.legenda), ni = pi > 0 ? Math.floor(saldo / pi) : 0, nl = pl > 0 ? Math.floor(saldo / pl) : 0;
      alcance = !nl ? ' (ainda não dá pra nenhuma)' : !ia ? ` (dá pra ${qts(nl, 'legenda', 'legendas')})`
        : ni ? ` (dá pra ${qts(ni, 'imagem', 'imagens')} ou ${qts(nl, 'legenda', 'legendas')})` : ` (dá pra ${qts(nl, 'legenda', 'legendas')}; imagem, ainda não)`;
    }
    return `${linha ? `<p class="lt-cota-l">${linha}</p>` : ''}
      <label class="switch"><input type="checkbox" id="lt-correal"${F.usaCorreal ? ' checked' : ''}><span class="sw"></span><span><b>Quando acabar o grátis, usar correal</b><small>imagem ${Fm(P.imagem)} · legenda ${Fm(P.legenda)} · você tem <span class="num">${saldo == null ? '…' : Fm(saldo / 100)}</span>${alcance}</small></span></label>`;
  }
  const pintaCota = () => {
    const el = C.$('lt-cota'); if(!el || !F) return;
    const sig = JSON.stringify([F.tipo === 'ia' ? F.n : F.arqs.length, F.iaLeg, F.usaCorreal, F.cotas, C.correal.saldo]);
    if(el.dataset.sig !== sig){ el.dataset.sig = sig; el.innerHTML = cotaHTML(); }
  };
  async function carregaCotas(){
    const f = F; if(!f) return;
    try{ const c = await C.api.fn('imagem', { acao: 'cotas' }); f.cotas = c; if(c && c.correal) C.correalLe(c.correal); }
    catch(e){ f.cotas = null; await C.correalCarrega(); }
    if(F === f) pintaCota();
  }
  function resumo(){
    const el = C.$('lt-resumo'); if(!el || !F) return;
    leCampos();
    const n = F.tipo === 'ia' ? F.n : F.arqs.length, ds = n ? vagas(F.mk, n, F.dias, F.hora, F.ini) : [];
    F.datas = ds;
    pintaCota();
    const c = F.conta && C.ig ? C.ig.porId(F.conta) : null;
    el.innerHTML = !F.dias.length ? 'Escolhe pelo menos um dia da semana.' : !n ? 'Escolhe as artes.' : ds.length ? `${ds.length} ${ds.length === 1 ? 'post' : 'posts'}: de <b>${curto(ds[0])}</b> a <b>${curto(ds[ds.length - 1])}</b>, às ${esc(F.hora)}${c ? `, saindo sozinho${ds.length === 1 ? '' : 's'} no <b>@${esc(c.username)}</b>` : ', como lembrete (sem conta, você posta à mão)'}. Dia que já tem post da marca fica de fora.` : 'Não achei vaga nesses dias.';
  }
  function leCampos(){
    if(!F) return;
    const h = C.$('lt-hora'), i = C.$('lt-ini'), a = C.$('lt-assunto'), l = C.$('lt-leg'), cr = C.$('lt-correal'), ct = C.$('lt-conta');
    if(h && h.value) F.hora = h.value; if(i && i.value) F.ini = i.value; if(a) F.assunto = a.value; if(l) F.iaLeg = l.checked; if(cr) F.usaCorreal = cr.checked;
    if(ct && ct.value !== F.conta){ F.conta = ct.value; F.contaMexeu = true; }
  }
  function abre(tipo){
    if(JOB && !JOB.fim){ C.sheet(`<div class="form lt"><div class="sheet-head"><h2>${ico('magia')} ${JOB.tipo === 'ia' ? 'O mês com IA' : 'Subir artes'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><div id="lt-corpo"></div></div>`, 'wide lt-sheet'); F = null; pinta(); return; }
    const mk = marcaPadrao(); if(!mk){ C.toast('Liga o Instagram de uma marca primeiro.'); return; }
    const q = QTD.find(x => x[0] === qtdPadrao);
    F = { tipo, mk, n: qtdPadrao, dias: q[2].slice(), hora: horaDe(mk), ini: amanha(), assunto: '', arqs: [], iaLeg: true, datas: [], pauta: null, cotas: null, usaCorreal: false, conta: contaPadrao(mk) };
    folha(); carregaCotas();
    /* as contas ainda não tinham carregado: o "Postar em" redesenha */
    if(C.ig) C.ig.carrega().then(() => { if(F && !F.contaMexeu){ F.conta = contaPadrao(F.mk); const w = C.$('lt-conta-w'); if(w) w.innerHTML = C.ig.seletor('lt-conta', F.conta, F.mk); resumo(); } });
  }
  function folha(){
    const ia = F.tipo === 'ia';
    C.sheet(`<div class="form lt"><div class="sheet-head"><h2>${ico(ia ? 'magia' : 'up')} ${ia ? 'O mês com IA' : 'Subir as artes do mês'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="lt-lead">${ia ? 'A IA monta a pauta, desenha cada arte com a cara da marca e escreve as legendas. Você confere a pauta e programa tudo de uma vez.' : 'As artes entram na agenda na ordem, nos dias e na hora que você escolher. A IA escreve a legenda de cada uma olhando a arte.'}</p>
      <div id="lt-corpo"></div></div>`, 'wide lt-sheet');
    plano();
  }
  function plano(){
    const box = C.$('lt-corpo'); if(!box) return;
    const ia = F.tipo === 'ia';
    box.innerHTML = `${mkChips(F.mk)}
      ${ia ? '' : `<div class="lt-subir"><button type="button" class="btn" data-act="lt-arqs">${ico('img')} ${F.arqs.length ? 'Pôr mais artes' : 'Escolher as artes'}</button><span class="hint">Até ${MAX_SUBIR}, na ordem em que aparecem aqui.</span></div>
        <ol class="lt-thumbs">${F.arqs.map((a, i) => `<li><img src="${esc(a.url)}" alt="Arte ${i + 1}"><button type="button" data-act="lt-arq-x" data-i="${i}" aria-label="Tirar a arte ${i + 1}">${ico('x')}</button><b class="num">${i + 1}</b></li>`).join('')}</ol>`}
      ${agendaHTML()}
      <div id="lt-conta-w">${C.ig ? C.ig.seletor('lt-conta', F.conta, F.mk) : ''}</div>
      ${ia ? `<div class="fld"><label for="lt-assunto">Do que o mês vai falar <small>(opcional)</small></label><textarea class="inp" id="lt-assunto" rows="2" maxlength="600" placeholder="Ex.: o combo novo, bastidor da cozinha, a promoção de terça">${esc(F.assunto)}</textarea><span class="hint">Separado por vírgula. O que você escrever entra na pauta; o resto a IA completa com o que funciona pro teu nicho (e as datas que vendem no mês).</span></div>`
        : `<label class="switch"><input type="checkbox" id="lt-leg"${F.iaLeg ? ' checked' : ''}><span class="sw"></span><span><b>A IA escreve as legendas</b><small>olhando cada arte, no tom da marca</small></span></label>`}
      <div class="acts sticky">${ia ? `<button type="button" class="btn pri" data-act="lt-pauta">${ico('magia')} Montar a pauta</button>` : `<button type="button" class="btn pri" data-act="lt-subir-ok"${F.arqs.length ? '' : ' disabled'}>${ico('clock')} Programar ${F.arqs.length || ''} ${F.arqs.length === 1 ? 'arte' : 'artes'}</button>`}</div>`;
    resumo();
    box.oninput = box.onchange = () => resumo();
  }
  function pautaTela(){
    const box = C.$('lt-corpo'); if(!box) return;
    box.innerHTML = `<p class="lt-st"><b>A pauta da ${esc(F.mk.marca)}.</b> Mexe no que quiser: o título vai grande na arte e a cena é o que a imagem mostra.${F.pautaIA ? '' : C.DEMO ? ' <span class="hint">(Na demonstração, a pauta sai do modelo do Corre.)</span>' : ' <span class="hint">(Montada pelo Corre: a IA de pauta não respondeu agora.)</span>'}</p>
      <ol class="lt-pauta">${F.pauta.map((x, i) => `<li class="lt-it"><span class="lt-q"><b class="num">${esc(curto(x.data))}</b><small>${esc(F.hora)}</small><span class="lt-tema">${esc(x.tema)}</span></span>
        <span class="lt-cx"><input class="inp lt-tt" data-i="${i}" data-k="titulo" maxlength="80" value="${esc(x.titulo)}" aria-label="Título do post de ${esc(curto(x.data))}"><input class="inp lt-cn" data-i="${i}" data-k="cena" maxlength="300" value="${esc(x.cena)}" aria-label="O que a imagem mostra"></span>
        <button type="button" class="lt-del" data-act="lt-tira" data-i="${i}" aria-label="Tirar esse post">${ico('x')}</button></li>`).join('')}</ol>
      <div class="acts sticky"><button type="button" class="btn ghost" data-act="lt-volta">${ico('prev')} Voltar</button><button type="button" class="btn pri" data-act="lt-gera"${F.pauta.length ? '' : ' disabled'}>${ico('magia')} Gerar ${F.pauta.length} ${F.pauta.length === 1 ? 'arte' : 'artes'} e programar</button></div>`;
    box.oninput = e => { const el = e.target; if(el && el.dataset && el.dataset.k && F.pauta[+el.dataset.i]) F.pauta[+el.dataset.i][el.dataset.k] = el.value; };
    box.onchange = null;
  }

  Object.assign(C.acts, {
    'lt-mes': () => abre('ia'),
    'lt-subir': () => abre('subir'),
    'lt-ver': () => { if(JOB){ if(JOB.fim) JOB.visto = false; abre(JOB.tipo); if(JOB.fim){ C.sheet(`<div class="form lt"><div class="sheet-head"><h2>${ico('magia')} ${JOB.tipo === 'ia' ? 'O mês com IA' : 'Subir artes'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div><div id="lt-corpo"></div></div>`, 'wide lt-sheet'); F = null; pinta(); } } },
    'lt-ok': () => { if(JOB) JOB.visto = true; barra(); },
    'lt-parar': el => { if(!JOB) return; if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.textContent = 'Parar mesmo?'; return; } JOB.parar = true; el.disabled = true; el.textContent = 'Parando depois dessa…'; },
    'lt-calendario': () => { if(JOB) JOB.visto = true; C.closeSheet(); barra(); },
    'lt-mk': el => { leCampos(); const m = S().marcas().find(x => x.id === el.dataset.id); if(!m) return; F.mk = m; F.hora = horaDe(m); F.conta = contaPadrao(m); F.contaMexeu = false; plano(); },
    'lt-qtd': el => { leCampos(); F.n = Number(el.dataset.n); const q = QTD.find(x => x[0] === F.n); if(q) F.dias = q[2].slice(); plano(); },
    'lt-dia': el => { leCampos(); const d = Number(el.dataset.d), i = F.dias.indexOf(d); if(i >= 0) F.dias.splice(i, 1); else F.dias.push(d); el.setAttribute('aria-pressed', String(i < 0)); resumo(); },
    'lt-arqs': () => {
      leCampos();
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
      inp.onchange = () => { const fs = [...(inp.files || [])].filter(f => /^image\//.test(f.type)).slice(0, MAX_SUBIR - F.arqs.length); fs.forEach(f => F.arqs.push({ file: f, url: URL.createObjectURL(f) })); inp.remove(); if(fs.length) plano(); };
      document.body.appendChild(inp); inp.click();
    },
    'lt-arq-x': el => { leCampos(); const a = F.arqs.splice(Number(el.dataset.i), 1)[0]; if(a) URL.revokeObjectURL(a.url); plano(); },
    'lt-pauta': async el => {
      leCampos(); resumo();
      if(!F.dias.length){ C.toast('Escolhe pelo menos um dia da semana.'); return; }
      if(!F.datas.length){ C.toast('Não achei vaga nesses dias. Muda o dia ou o "a partir de".'); return; }
      el.disabled = true; el.innerHTML = `${ico('magia')} Montando a pauta…`;
      /* v3.55: a folha pode fechar (ou abrir outra, de outra marca) enquanto a IA pensa: a pauta fica com quem pediu */
      const f = F; let pauta, ia;
      try{ pauta = await pautaIA(f.mk, f.datas, f.assunto, f); ia = true; }
      catch(e){ pauta = pautaLocal(f.mk, f.datas, f.assunto); ia = false; }
      if(F !== f || !C.$('lt-corpo')) return;
      F.pauta = pauta; F.pautaIA = ia;
      pautaTela();
    },
    'lt-volta': () => plano(),
    'lt-tira': el => { F.pauta.splice(Number(el.dataset.i), 1); pautaTela(); },
    'lt-gera': () => {
      if(!F || !F.pauta || !F.pauta.length) return;
      const job = novoJob('ia', F.mk, F.pauta.filter(x => String(x.titulo || '').trim()), F.hora, { usaCorreal: !!F.usaCorreal, conta: F.conta || '', gastou: F.pautaPago || 0 });
      F = null; roda(job);
    },
    'lt-subir-ok': () => {
      leCampos(); resumo();
      if(!F.arqs.length){ C.toast('Escolhe as artes.'); return; }
      if(F.datas.length < F.arqs.length){ C.toast(`Só achei ${F.datas.length} ${F.datas.length === 1 ? 'vaga' : 'vagas'} pra ${F.arqs.length} artes. Põe mais dias na semana.`, 4200); return; }
      const itens = F.arqs.map((a, i) => ({ data: F.datas[i], tema: '', titulo: nomeDoArquivo(a.file), cena: '', arquivo: a.file, n: i + 1 }));
      const job = novoJob('subir', F.mk, itens, F.hora, { iaLeg: F.iaLeg, usaCorreal: !!F.usaCorreal, conta: F.conta || '' });
      F = null; roda(job);
    }
  });
  /* v4.29 · o Monta meu Corre: o mês programado sem a folha. A pauta da IA (ou a do Corre), a arte no modelo da marca, sem
     foto de IA (pra caber no grátis do dia de quem acabou de chegar), e a legenda da IA. Roda em segundo plano, com a barra
     em cima do calendário; quem chama acompanha pelo trabalho() */
  async function mesAuto(mk, o){
    o = o || {};
    if(JOB && !JOB.fim) return null;
    const q = QTD.find(x => x[0] === (o.n || 12)) || QTD[2], hora = o.hora || '18:00';
    const datas = vagas(mk, q[0], q[2], hora, o.ini || amanha());
    if(!datas.length) return null;
    let pauta; try{ pauta = await pautaIA(mk, datas, o.assunto || ''); }catch(e){ pauta = pautaLocal(mk, datas, o.assunto || ''); }
    const job = novoJob('ia', mk, pauta.filter(x => String(x.titulo || '').trim()), hora, { iaImg: false, conta: o.conta || '' });
    roda(job);
    return job;
  }
  C.lote = { barra, pautaLocal, vagas, mesAuto, trabalho: () => JOB };
})();
