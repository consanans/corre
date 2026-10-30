/* CORRE · MONTA MEU CORRE (v4.29)
   O Thales: "quem entra vê ferramenta, não resultado". Agora quem acabou de criar o perfil escreve numa frase o que
   faz, e em uns 2 minutos o Corre entrega, montado com a IA que já existe (nada de função nova):
   - o link na bio no ar (a frase dela em cima; orçamento, WhatsApp, vitrine e Instagram embaixo);
   - o mês no Studio Cria: a marca dela (com o @ do Instagram) e 12 posts nas próximas 4 semanas, com a pauta e a legenda da
     IA e a arte no modelo da marca (o "Mês com IA" do lote.js, sem foto de IA pra caber no grátis do dia). Sem conta
     do Instagram conectada, cada post vira o aviso "hora de postar";
   - clientes no Hórus (quem vende pra empresa): o Hórus montado pela frase (a mesma IA do "Monta o Hórus pra mim") e
     até 20 empresas da cidade com WhatsApp, as de celular primeiro (ou o ramo que ela escolheu na página dos clientes);
   - a semana no Caderninho: 6 tarefas, uma por dia, ligadas ao que acabou de ser montado (e tarefa feita é trampo:
     rende correal e a placa na frente da casa no Correverso).
   Cada coisa é independente: uma que falha não para as outras, e a tela diz o que deu e o que não deu. Dá pra voltar
   aqui depois (#/monta, pelos Primeiros passos ou pela busca); o que já existe não é refeito por cima. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, st = C.st, api = C.api;
  const K = () => 'corre-monta:' + (st.me && st.me.id);
  const ls = { get(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  const Z = () => C.horus && C.horus._;
  /* quem vende pra empresa: pelo "Meu corre" (o mesmo da Estreia) ou porque veio da página dos clientes */
  const B2B = ['social', 'design', 'site', 'trafego', 'foto_video', 'juridico', 'tecnica', 'reforma', 'eventos', 'comida', 'frete'];
  /* o ramo de empresa que mais compra de cada corre (o primeiro palpite; dá pra trocar) */
  const RAMO = { social: 'comida', design: 'comida', site: 'saude', trafego: 'estetica', foto_video: 'comida', juridico: 'escritorio', tecnica: 'escritorio', reforma: 'imovel', eventos: 'eventos', comida: 'cafe', frete: 'obra', beleza: 'estetica', moda: 'moda', aulas: 'educacao' };
  /* a cor da marca nova: das da casa, nenhuma verde */
  const CORES = ['#FFE800', '#FF48B0', '#38E1FF', '#FF6C2F', '#9B6BFF'];
  const EXEMPLOS = ['faço social media pra restaurantes', 'sou barbeiro no Centro', 'faço bolo de pote e coffee break pra empresas', 'instalo ar-condicionado em comércio', 'sou fotógrafa de casamento', 'dou aula de inglês online'];
  const M = { st: null, it: null, t: 0 };
  const hoje = () => C.hojeBR();
  const maisDias = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const frasePronta = q => { const t = String(q || '').trim().replace(/\s+/g, ' ').replace(/[.!]+$/, ''); return t ? (t[0].toUpperCase() + t.slice(1)).slice(0, 140) : ''; };

  /* ---------- o formulário ---------- */
  function form(){
    const me = st.me, l = C.clientes && C.clientes.leva(), b2b = !!l || (B2B.includes(me.categoria) && me.vende_pra !== 'pessoas');
    const ramo = l ? l.k : (RAMO[me.categoria] || ''), N = (C.clientes && C.clientes.NICHOS()) || [];
    const ja = ls.get(K());
    return `<main class="wrap mm" id="mm">
      <div class="hello mm-hero"><p class="mm-olho">${ico('magia')} Monta meu Corre</p>
        <h1 class="mm-t"><span class="hl">Conta o que você faz.</span> O Corre monta o resto.</h1>
        <p class="mm-lead">Numa frase, do teu jeito. Em uns 2 minutos você tem o link na bio no ar, o mês de posts no Studio Cria${b2b ? ', clientes no Hórus' : ''} e a semana no Caderninho.${ja ? ' <b>Você já montou uma vez:</b> o que já existe não é refeito.' : ''}</p></div>
      <form class="card mm-f" id="mm-f" novalidate>
        <div class="fld"><label for="mm-q">O que você faz, pra quem?</label><textarea class="inp" id="mm-q" rows="2" maxlength="300" placeholder="Ex.: faço bolo de pote e coffee break pra empresas">${esc(me.faz || '')}</textarea></div>
        <div class="chips mm-ex">${EXEMPLOS.map(t => `<button type="button" class="chip" data-act="mm-ex" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="row2">
          <div class="fld"><label for="mm-n">Nome do teu negócio</label><input class="inp" id="mm-n" maxlength="60" value="${esc(me.nome || '')}" placeholder="Ou o teu nome"></div>
          <div class="fld"><label for="mm-ig">Teu Instagram</label><div class="at"><input class="inp" id="mm-ig" maxlength="30" value="${esc(me.instagram || '')}" autocapitalize="none" spellcheck="false" placeholder="seu.perfil"></div></div>
        </div>
        <div class="fld"><label for="mm-cid">Cidade</label><input class="inp" id="mm-cid" maxlength="60" value="${esc(l ? `${l.cidade}, ${l.uf}` : me.cidade || '')}" placeholder="Londrina, PR" autocomplete="address-level2"></div>
        <fieldset class="mm-itens"><legend>O que montar</legend>
          ${item('bio', 'link', 'Teu link na bio no ar', `${location.host}/@${me.handle}: tua frase em cima, orçamento, WhatsApp e Instagram embaixo.`, true)}
          ${item('studio', 'magia', 'O mês no Studio Cria', '12 posts nas próximas 4 semanas: pauta, arte e legenda. Na hora de cada um, o Corre te avisa.', true)}
          ${item('horus', 'eye', 'Clientes no Hórus', 'Até 20 empresas da tua cidade com WhatsApp, cada uma com a primeira mensagem pronta.', b2b,
            `<label class="mm-sub" for="mm-ramo">Quem você quer atender</label><select class="inp" id="mm-ramo"><option value="">Deixa a IA escolher pela tua frase</option>${N.map(([k, n]) => `<option value="${esc(k)}"${k === ramo && l ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`)}
          ${item('cad', 'caderno', 'A semana no Caderninho', '6 tarefas, uma por dia, pra começar. Tarefa feita rende correal.', true)}
        </fieldset>
        <div class="acts mm-acts"><button type="submit" class="btn pri" id="mm-vai">${ico('magia')} Montar meu Corre</button><a class="btn ghost" href="#/">Agora não</a></div>
      </form>
    </main>`;
  }
  function item(k, ic, t, d, on, extra){
    return `<label class="mm-i"><input type="checkbox" name="mm-${k}"${on ? ' checked' : ''}><span class="mm-ic" aria-hidden="true">${ico(ic)}</span><span class="mm-tx"><b>${esc(t)}</b><small>${esc(d)}</small></span></label>${extra ? `<div class="mm-extra" data-de="${k}">${extra}</div>` : ''}`;
  }

  /* ---------- a montagem: cada coisa por si ---------- */
  const PASSOS = { bio: ['link', 'Link na bio', '#/linkbio'], horus: ['eye', 'Clientes no Hórus', '#/horus'], studio: ['magia', 'O mês no Studio Cria', '#/studio'], cad: ['caderno', 'A semana no Caderninho', '#/caderninho'] };
  function progresso(){
    const L = M.it;
    return `<main class="wrap mm" id="mm"><div class="hello mm-hero"><p class="mm-olho">${ico('magia')} Monta meu Corre</p>
      <h1 class="mm-t"><span class="hl">${M.fim ? 'Teu Corre tá montado.' : 'Montando teu Corre…'}</span></h1>
      <p class="mm-lead">${M.fim ? 'Daqui pra frente é contigo: cada tarefa feita, post programado e cliente chamado rende correal e a placa na frente da tua casa no Correverso.' : 'Pode ficar aqui: cada linha acende quando fica pronta.'}</p></div>
      ${M.fim ? liga() : ''}
      <ol class="card mm-prog" aria-live="polite">${Object.keys(L).map(k => { const x = L[k], P = PASSOS[k];
        return `<li class="mm-p ${x.s}"><span class="mm-pi" aria-hidden="true">${x.s === 'ok' ? ico('check') : x.s === 'erro' ? ico('x') : x.s === 'pulou' ? '–' : ico(P[0])}</span>
          <span class="mm-ptx"><b>${esc(P[1])}</b><small>${esc(x.txt || (x.s === 'fila' ? 'Na fila' : x.s === 'indo' ? 'Fazendo…' : ''))}</small></span>${x.s === 'ok' || (k === 'studio' && x.s === 'indo' && x.job) ? `<a class="btn sm" href="${x.ir || P[2]}">Ver</a>` : ''}</li>`; }).join('')}</ol>
      ${M.fim ? `<div class="acts mm-acts">${M.it.horus && M.it.horus.s === 'ok' && M.it.horus.n ? `<a class="btn pri" href="#/horus">${ico('eye')} Chamar os primeiros clientes</a>` : `<a class="btn pri" href="#/caderninho">${ico('caderno')} Ver a semana</a>`}<a class="btn" href="#/">Ir pro Início</a></div>` : ''}
    </main>`;
  }
  /* v5.10 · o último passo que faz o mês sair sozinho: conectar o Instagram da marca. Sem ele os 12 posts viram lembrete;
     com a Meta liberada, é o botão que mais importa nessa tela. A volta do login cai no Studio Cria da marca (não aqui:
     esta tela não sobrevive à ida pro Instagram), e lá os posts já programados pegam a conta */
  function liga(){
    const x = M.it.studio;
    if(!x || x.s !== 'ok' || !x.rede || !C.ig || !C.ig.aberto() || (C.ig.conectadas() || []).some(c => c.username === x.rede)) return '';
    return `<div class="card mm-liga"><p><b>${ico('ig')} Falta 1 toque pra eles saírem sozinhos</b>Conecta o @${esc(x.rede)} (login na própria conta do Instagram) e os posts do mês saem no dia e na hora, sem você abrir nada. Sem conectar, na hora de cada um o Corre te avisa pra postar à mão.</p>
      <button type="button" class="btn pri" data-act="ig-conectar" data-rede="${esc(x.rede)}" data-volta="${esc(x.ir || '#/studio')}">${ico('ig')} Conectar o @${esc(x.rede)}</button></div>`;
  }
  const pinta = () => { const a = $('app'); if(!a || !$('mm')) return; const y = window.scrollY; a.querySelector('#mm').outerHTML = progresso(); window.scrollTo(0, y); };
  const marca = (k, s, txt, extra) => { Object.assign(M.it[k], { s, txt }, extra || {}); pinta(); };

  async function bio(q){
    const b = st.me.bio_link && typeof st.me.bio_link === 'object' ? st.me.bio_link : {};
    const tem = Object.keys(b).some(x => x !== 'links') || (Array.isArray(b.links) && b.links.length);
    if(tem){ marca('bio', 'ok', 'Já tava montado: ficou como você deixou.'); return; }
    await C.saveMe({ bio_link: { on: true, tema: 'corre', frase: frasePronta(q), links: [] } });
    marca('bio', 'ok', `No ar: ${location.host}/@${st.me.handle}. Cola na bio do Instagram.`);
  }
  async function horus(q, o){
    const z = Z(); if(!z) throw { code: 'sem' };
    if(!C.ferr('horus')) await C.saveMe({ ferramentas: Object.assign({}, st.me.ferramentas || {}, { horus: true }) });
    const c = z.cfg();
    /* o Hórus montado pela frase (só quando ainda não foi montado: o de quem já ajustou fica) */
    if(!c.montado && C.horusMax && C.horusMax.montarIA){
      marca('horus', 'indo', 'Entendendo quem compra de você…');
      try{ const m = await C.horusMax.montarIA(q); await z.saveCfg({ preset: m.origem === 'ia' ? 'ia' : 'montado', oferta: m.oferta, nichos: m.nichos, tpl: m.tpl, faro: m.faro, montado: q }); }catch(e){}
    }
    /* a cidade que a pessoa escreveu aqui vira a praça da caça (se for outra) */
    if(o.cidade && z.setPraca && C.norm(o.cidade) !== C.norm(z.cfg().praca.cidade || '')){ try{ await z.setPraca({ cidade: o.cidade, uf: o.uf, ddd: '' }); }catch(e){} }
    if(!z.cfg().praca.cidade){ marca('horus', 'pulou', 'Faltou a cidade (com o estado, tipo "Londrina, PR"). Dá pra caçar depois, no Hórus.'); return; }
    marca('horus', 'indo', `Procurando empresas em ${z.cfg().praca.cidade} no mapa…`);
    let r;
    if(C.DEMO) r = await C.clientes.cacaDemo({ k: o.ramo || RAMO[st.me.categoria] || 'comida', cidade: z.cfg().praca.cidade, uf: z.cfg().praca.uf, max: 20 });
    else if(o.ramo && C.horusTurbo.cacaNicho) r = await C.horusTurbo.cacaNicho({ k: o.ramo, cidade: z.cfg().praca.cidade, uf: z.cfg().praca.uf, max: 20, assunto: 'Monta meu Corre' });
    else { r = await C.horusTurbo.garimpa({ max: 20 }); await z.load(); }
    if(C.clientes) C.clientes.esquece();
    marca('horus', 'ok', r.novas ? `${r.novas} ${r.novas === 1 ? 'empresa' : 'empresas'} no radar${r.wa ? `, ${r.wa} com WhatsApp` : ''}. A primeira mensagem de cada uma tá pronta.` : 'O mapa não achou empresa nova com telefone aí. No Hórus dá pra caçar por bairro ou colar uma lista.', { n: r.novas });
  }
  async function studio(o){
    if(!C.lote || !C.lote.mesAuto){ marca('studio', 'pulou', 'O Studio Cria não abriu agora.'); return; }
    const rede = String(o.ig || '').replace(/^@/, '').trim();
    let L = []; try{ L = await api.q('corre_portfolio', { eq: { dono: st.me.id }, limit: 50 }); }catch(e){}
    let mk = L.find(m => m.rede && (!rede || m.rede === rede)) || L.find(m => m.rede);
    if(!mk){
      if(!rede){ marca('studio', 'pulou', 'Põe teu Instagram aqui em cima pra o Studio Cria montar o mês.'); return; }
      const row = { marca: String(o.nome || st.me.nome || st.me.handle).slice(0, 60), segmento: String((C.meuCorre && C.meuCorre.catNome(st.me.categoria)) || '').slice(0, 60), papel: 'Minha marca', rede, cor: CORES[C.hash(st.me.id) % CORES.length], publico: true, ordem: L.length };
      const r = await api.ins('corre_portfolio', row); mk = r && r[0];
      if(!mk) throw { code: 'marca' };
    }
    marca('studio', 'indo', `A IA tá fazendo a pauta da ${mk.marca}…`);
    const job = await C.lote.mesAuto(mk, { n: 12, assunto: o.q });
    if(!job){ marca('studio', 'pulou', 'O Studio Cria já tava fazendo um mês agora. Confere no calendário.'); return; }
    M.it.studio.job = job; M.it.studio.ir = '#/studio/' + mk.id; M.it.studio.rede = String(mk.rede || '').toLowerCase();
    /* acompanha o trabalho (ele segue mesmo se a pessoa sair daqui) */
    await new Promise(ok => {
      const passo = () => {
        const n = job.itens.length;
        if(job.fim){ if(C.ig) C.ig.carrega(true).then(pinta, () => {});
          marca('studio', job.feitos ? 'ok' : 'erro', job.feitos ? `${job.feitos} posts programados pra ${mk.marca}, de ${C.ddmm(job.itens[0].data)} a ${C.ddmm(job.itens[n - 1].data)}.` : 'Não deu pra criar os posts agora. Tenta pelo "Mês com IA" do Studio Cria.'); ok(); return; }
        marca('studio', 'indo', `Fazendo os posts: ${job.feitos} de ${n}…`);
        M.t = setTimeout(passo, 900);
      };
      passo();
    });
  }
  async function caderno(o){
    const d0 = hoje(), me = st.me, F = M.it;
    const L = [
      F.bio && F.bio.s === 'ok' ? ['Cola o link na bio no Instagram', `${location.host}/@${me.handle}`] : ['Monta o link na bio', 'Perfil › Link na bio'],
      F.horus && F.horus.s === 'ok' && F.horus.n ? ['Chama os 5 primeiros clientes do Hórus', 'A mensagem de cada um já tá pronta. Arrasta a carta pra direita.'] : ['Manda o link na bio pra 5 clientes antigos', 'E pede uma indicação pra cada um.'],
      F.studio && F.studio.job ? ['Confere os posts da semana no Studio Cria', 'Mexe na arte ou na legenda do que não tiver a tua cara.'] : ['Faz o primeiro post', 'Mostra um trampo teu.'],
      ['Põe 3 coisas com preço na vitrine', 'O que você vende aparece no perfil e no link na bio.'],
      ['Pede uma foto ou um depoimento pra um cliente', 'Vira post e vira prova.'],
      ['Olha quanto o corre rendeu na semana', 'Vendas e Grana: o que entrou e o que falta cobrar.']
    ];
    const rows = L.map(([titulo, nota], i) => ({ titulo, nota, dia: maisDias(d0, i), lista: 'Começo', prio: i === 0 ? 2 : 4 }));
    await api.ins('corre_caderno', rows);
    marca('cad', 'ok', '6 tarefas, de hoje até ' + C.ddmm(rows[5].dia) + '.');
  }
  async function monta(o){
    M.fim = false; M.it = {};
    ['bio', 'horus', 'studio', 'cad'].forEach(k => { if(o[k]) M.it[k] = { s: 'fila', txt: '' }; });
    $('app').innerHTML = C.header('') + progresso();
    window.scrollTo(0, 0);
    if(o.q && o.q !== st.me.faz){ try{ await C.saveMe({ faz: o.q.slice(0, 160) }); }catch(e){} }
    if(o.ig && o.ig !== st.me.instagram && /^[A-Za-z0-9_.]{1,30}$/.test(o.ig)){ try{ await C.saveMe({ instagram: o.ig }); }catch(e){} }
    const roda = async (k, f) => { if(!M.it[k]) return; marca(k, 'indo', ''); try{ await f(); }catch(e){ marca(k, 'erro', C.errMsg(e, 'Não deu agora. Dá pra fazer depois, na ferramenta.')); } };
    /* o link na bio é na hora; o Hórus e o Studio Cria correm juntos (cada um fala com o mapa ou com a IA); o Caderninho por
       último, que as tarefas falam do que deu certo */
    await roda('bio', () => bio(o.q));
    await Promise.all([roda('horus', () => horus(o.q, o)), roda('studio', () => studio(o))]);
    await roda('cad', () => caderno(o));
    M.fim = true; pinta();
    ls.set(K(), { em: Date.now(), ok: Object.keys(M.it).filter(k => M.it[k].s === 'ok') });
    if(C.estreia && C.estreia.refaz) C.estreia.refaz();
  }

  C.views.monta = app => {
    if(M.it && !M.fim && $('mm')) return;
    app.innerHTML = C.header('') + form();
    const f = $('mm-f'), extra = () => { document.querySelectorAll('.mm-extra').forEach(x => { const cb = f.querySelector(`input[name="mm-${x.dataset.de}"]`); x.hidden = !(cb && cb.checked); }); };
    extra(); f.addEventListener('change', extra);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const q = $('mm-q').value.trim();
      if(q.length < 6){ toast('Conta um pouco mais do que você faz.'); $('mm-q').focus(); return; }
      const z = Z(), lugar = z ? z.parseLugar($('mm-cid').value) : { cidade: '', uf: '' };
      const o = { q, nome: $('mm-n').value.trim(), ig: $('mm-ig').value.trim().replace(/^@/, ''), cidade: lugar.cidade, uf: lugar.uf, ramo: ($('mm-ramo') || {}).value || '' };
      ['bio', 'horus', 'studio', 'cad'].forEach(k => { const cb = f.querySelector(`input[name="mm-${k}"]`); o[k] = !!(cb && cb.checked); });
      if(!o.bio && !o.horus && !o.studio && !o.cad){ toast('Escolhe pelo menos uma coisa pra montar.'); return; }
      if(o.horus && o.cidade && !o.uf){ toast('Põe o estado junto da cidade (ex.: Londrina, PR).'); $('mm-cid').focus(); return; }
      monta(o);
    });
  };
  Object.assign(C.acts, {
    'mm-ex': el => { const q = $('mm-q'); if(q){ q.value = el.dataset.t; q.focus(); } }
  });
  C.monta = { feito: () => !!(st.me && ls.get(K())) };
})();
