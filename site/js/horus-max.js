/* CORRE · HÓRUS 4 (MAX)
   1. Monta o Hórus pra qualquer negócio: a pessoa diz numa frase o que vende e a IA monta os nichos,
      onde caçar no mapa, a dor de cada um, o faro e as mensagens. Sem IA, um catálogo local faz o básico.
   2. Sprint de 15 minutos: um lead por vez, enviar / pular / liguei, com cronômetro, placar e recorde.
   3. Lead que vem até você: um link público de orçamento (#/orcamento/handle) que cai no Hórus como
      Interessado, o mais quente do radar.
   (A caça ao vivo e o faro moram no horus.js e no horus-turbo.js.) */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  if(!C.horus || !C.horus._) return;
  const Z = C.horus._, H = Z.H;
  const MX = {};

  /* ============================== 1. MONTA O HÓRUS PRA QUALQUER NEGÓCIO ============================== */
  /* nichos que o mapa sabe achar (OpenStreetMap) */
  const NB = {
    comida: ['Restaurantes e lanchonetes', [['amenity', '~', '^(restaurant|fast_food|food_court)$']], 'restaurante|lanchonete|lanches|pizz|hamburg|burger|sushi|churrasc|marmit'],
    padaria: ['Padarias e confeitarias', [['shop', '~', '^(bakery|pastry|confectionery)$']], 'padaria|panificadora|confeitaria|doceria'],
    mercado: ['Mercados e mercearias', [['shop', '~', '^(supermarket|convenience|greengrocer|butcher)$']], 'mercado|mercearia|supermercado|a[cç]ougue|hortifruti'],
    farmacia: ['Farmácias', [['amenity', '=', 'pharmacy'], ['shop', '=', 'chemist']], 'farm[aá]cia|drogaria'],
    clinica: ['Clínicas e consultórios', [['amenity', '~', '^(clinic|doctors|dentist)$'], ['healthcare', '~', '^(clinic|doctor|dentist|physiotherapist)$']], 'cl[ií]nica|odonto|consult[oó]rio|m[eé]dic|fisioterap'],
    estetica: ['Estética, salões e barbearias', [['shop', '~', '^(beauty|hairdresser|nail_salon|barber|cosmetics)$']], 'est[eé]tica|sal[aã]o|barbearia|cabeleireir|manicure|beleza'],
    academia: ['Academias e estúdios', [['leisure', '~', '^(fitness_centre|sports_centre)$']], 'academia|fitness|crossfit|pilates|studio'],
    escola: ['Escolas e cursos', [['amenity', '~', '^(school|language_school|music_school|kindergarten|college|driving_school)$']], 'escola|col[eé]gio|curso|idiomas|educa[cç][aã]o infantil|autoescola'],
    loja: ['Lojas de roupa e calçado', [['shop', '~', '^(clothes|shoes|boutique|jewelry|bag)$']], 'moda|boutique|cal[cç]ados|roupas|joalheria'],
    moveis: ['Móveis e decoração', [['shop', '~', '^(furniture|interior_decoration|kitchen|bed)$']], 'm[oó]veis|decora[cç][aã]o|colch[oõ]es|planejados'],
    eletro: ['Eletrônicos e celulares', [['shop', '~', '^(electronics|mobile_phone|computer)$']], 'celular|eletr[oô]nic|inform[aá]tica|assist[eê]ncia t[eé]cnica'],
    auto: ['Oficinas e autopeças', [['shop', '~', '^(car_repair|car_parts|tyres|car)$'], ['amenity', '=', 'car_wash']], 'oficina|auto ?pe[cç]as|mec[aâ]nic|pneus|lava ?jato|funilaria'],
    posto: ['Postos de combustível', [['amenity', '=', 'fuel']], 'posto|combust[ií]vel'],
    hotel: ['Hotéis e pousadas', [['tourism', '~', '^(hotel|guest_house|hostel|motel)$']], 'hotel|pousada|hostel|motel'],
    escritorio: ['Advocacia e contabilidade', [['office', '~', '^(lawyer|accountant|tax_advisor|notary)$']], 'advoca|advogad|contab|contador|jur[ií]dic'],
    imobiliaria: ['Imobiliárias e construtoras', [['office', '~', '^(estate_agent|construction_company)$']], 'imobili[aá]ria|im[oó]veis|construtora|incorporadora'],
    construcao: ['Material de construção', [['shop', '~', '^(hardware|doityourself|trade|paint)$']], 'material de constru|ferragens|madeireira|tintas'],
    transporte: ['Transportadoras e logística', [['office', '~', '^(logistics|moving_company|courier)$']], 'transport|log[ií]stica|mudan[cç]as|frete|cargas'],
    empresa: ['Empresas e escritórios', [['office', '~', '^(company|it|insurance|financial|consulting|employment_agency)$']], 'ltda|consultoria|empresa|sistemas|tecnologia'],
    industria: ['Indústrias e oficinas de produção', [['craft', '~', '^(metal_construction|carpenter|upholsterer|tailor|printer|brewery)$'], ['man_made', '=', 'works']], 'ind[uú]stria|metal[uú]rgica|marcenaria|f[aá]brica|confec[cç][aã]o'],
    pet: ['Pet shops e veterinários', [['shop', '~', '^(pet|pet_grooming)$'], ['amenity', '=', 'veterinary']], 'pet|veterin[aá]ri|banho e tosa'],
    bar: ['Bares e casas noturnas', [['amenity', '~', '^(bar|pub|nightclub|biergarten)$']], 'bar|pub|choperia|boteco|balada'],
    eventos: ['Espaços de eventos e buffets', [['amenity', '~', '^(events_venue|conference_centre)$']], 'eventos|buffet|recep[cç][oõ]es|ch[aá]cara'],
    agro: ['Agropecuárias e produtores', [['shop', '~', '^(agrarian|farm|garden_centre)$']], 'agropecu[aá]ria|agro|rural|fazenda|sementes'],
    otica: ['Óticas', [['shop', '=', 'optician']], '[oó]tica'],
    igreja: ['Igrejas e associações', [['amenity', '=', 'place_of_worship'], ['office', '=', 'association']], 'igreja|par[oó]quia|associa[cç][aã]o|minist[eé]rio']
  };
  /* tipos de negócio: o que a frase diz → pra quem vender, a dor, o valor e o pedido */
  const ARQ = [
    { re: /tatua|tattoo|piercing|fine ?line|blackwork|old ?school|tatuad/i, oferta: 'tatuagem autoral', alvos: ['estetica', 'loja', 'bar', 'eventos', 'academia'], faro: ['nova', 'aberto_tarde', 'rede'],
      dor: 'A {empresa} já fez alguma ação pra trazer público novo pro espaço?', valor: 'Faço flash day: tatuagem pronta, preço fechado, um dia na {empresa}. Traz gente nova, rende post pros dois e o povo sai falando de vocês.', gancho: 'um flash day aí na {empresa}', pedido: 'Posso te mandar a ideia com as datas livres e como a gente divide?' },
    { re: /solar|fotovolt|energia/i, oferta: 'energia solar', alvos: ['mercado', 'padaria', 'comida', 'posto', 'industria', 'academia', 'hotel', 'agro'], faro: ['rede', '24h', 'aberto_tarde', 'nova'],
      dor: 'Quanto a {empresa} paga de luz por mês? Com freezer, forno ou ar ligado o dia todo, essa conta pesa todo mês.', valor: 'Energia solar corta a maior parte dessa conta e a parcela costuma caber no que hoje vai pra luz.', gancho: 'a conta de luz virando investimento', pedido: 'Posso te mandar uma simulação de economia pra {empresa}? Só preciso de uma conta de luz.' },
    { re: /seguro|consórcio|consorcio|plano de saúde|plano de saude|previd/i, oferta: 'seguros e benefícios', alvos: ['escritorio', 'empresa', 'loja', 'comida', 'transporte', 'clinica', 'escola'], faro: ['rede', 'nova'],
      dor: 'Se um imprevisto parar a {empresa} uma semana, quanto isso custa?', valor: 'Monto a proteção certa pra empresa e pra equipe, sem pagar por cobertura que não usa.', gancho: 'proteção do tamanho da empresa', pedido: 'Posso te mandar uma cotação rápida pra {empresa}?' },
    { re: /contab|contador|fiscal|imposto|mei\b|abrir empresa/i, oferta: 'contabilidade', alvos: ['comida', 'estetica', 'loja', 'clinica', 'academia', 'escola', 'auto'], faro: ['nova', 'rede'],
      dor: 'A {empresa} tá no regime de imposto certo ou paga mais do que precisa todo mês?', valor: 'Faço o diagnóstico do enquadramento e cuido da parte fiscal pra sobrar tempo e dinheiro.', gancho: 'imposto no tamanho certo', pedido: 'Posso fazer um diagnóstico rápido pra {empresa}, sem compromisso?' },
    { re: /software|sistema|app\b|aplicativo|automa|chatbot|\bia\b|intelig[eê]ncia artificial|crm|erp|agendamento/i, oferta: 'sistemas e automação', alvos: ['clinica', 'estetica', 'academia', 'escola', 'comida', 'loja', 'auto'], faro: ['so_fixo', 'sem_site', 'sem_horario'],
      dor: 'Quanto tempo a {empresa} perde por dia respondendo WhatsApp e marcando horário na mão?', valor: 'Automatizo o atendimento e a agenda pra equipe focar em quem tá na frente.', gancho: 'menos tempo no WhatsApp, mais cliente atendido', pedido: 'Posso te mostrar em 10 minutos como ficaria na {empresa}?' },
    { re: /rastreador|rastreamento|frota|telemetria|kivotrack/i, oferta: 'rastreamento de frota', alvos: ['transporte', 'construcao', 'auto', 'agro', 'posto', 'escola'], faro: ['rede'],
      dor: 'Hoje a {empresa} sabe onde cada veículo tá agora?', valor: 'Rastreador com app no celular, bloqueio e histórico de rota.', gancho: 'cada veículo no mapa, no teu celular', pedido: 'Posso passar aí 10 minutos essa semana?' },
    { re: /limpeza|dedetiz|conserva[cç][aã]o|manuten[cç][aã]o|ar[- ]condicionado|climatiza|jardinag|piscina/i, oferta: 'manutenção e limpeza', alvos: ['comida', 'clinica', 'escola', 'hotel', 'mercado', 'escritorio', 'academia'], faro: ['rede', '24h', 'nova'],
      dor: 'Quem cuida da manutenção da {empresa} hoje: tem alguém fixo ou é sempre na correria?', valor: 'Faço a manutenção programada pra nada parar no meio do expediente.', gancho: 'nada parando no meio do expediente', pedido: 'Posso passar aí pra uma visita técnica rápida?' },
    { re: /uniforme|brinde|gr[aá]fica|impress|comunica[cç][aã]o visual|fachada|placa|adesivo|banner|letreiro/i, oferta: 'comunicação visual e uniformes', alvos: ['comida', 'loja', 'academia', 'escola', 'clinica', 'construcao', 'auto'], faro: ['nova', 'rede'],
      dor: 'De longe, a fachada e o uniforme da {empresa} dizem o que vocês fazem em 3 segundos?', valor: 'Faço fachada, uniforme e material impresso com cara de marca.', gancho: 'a marca aparecendo de longe', pedido: 'Posso te mandar umas ideias pra {empresa}?' },
    { re: /fot[oó]graf|filmag|v[ií]deo|drone|audiovisual/i, oferta: 'foto e vídeo', alvos: ['comida', 'hotel', 'eventos', 'imobiliaria', 'estetica', 'loja', 'academia'], faro: ['sem_insta', 'sem_site', 'nova'],
      dor: 'As fotos da {empresa} hoje vendem o lugar ou só mostram que ele existe?', valor: 'Faço foto e vídeo que dão vontade de ir até aí.', gancho: 'foto que dá vontade de ir', pedido: 'Posso te mandar uma ideia de ensaio pra {empresa}?' },
    { re: /bolo|doce|salgad|marmit|coffee break|buffet|caf[eé] da manh[aã]|comida|aliment/i, oferta: 'comida pra empresas e eventos', alvos: ['escritorio', 'empresa', 'escola', 'clinica', 'academia', 'eventos', 'imobiliaria'], faro: ['rede', 'nova'],
      dor: 'Quando a {empresa} tem reunião, aniversário da equipe ou evento, quem resolve o lanche?', valor: 'Entrego café da manhã, coffee break e doce de festa, tudo no horário.', gancho: 'o lanche resolvido sem dor de cabeça', pedido: 'Posso te mandar o cardápio pra empresas?' },
    { re: /seguran[cç]a|c[aâ]mera|alarme|portaria|monitoramento|cerca/i, oferta: 'segurança e câmeras', alvos: ['loja', 'mercado', 'posto', 'escola', 'clinica', 'comida', 'construcao'], faro: ['24h', 'aberto_tarde', 'rede'],
      dor: 'Se acontecer alguma coisa na {empresa} de madrugada, você fica sabendo na hora?', valor: 'Instalo câmera e alarme que avisam no celular, com imagem de qualquer lugar.', gancho: 'a empresa no teu celular, 24 horas', pedido: 'Posso passar aí pra uma avaliação sem custo?' },
    { re: /internet|provedor|fibra|telefonia|telecom/i, oferta: 'internet empresarial', alvos: ['escritorio', 'comida', 'loja', 'clinica', 'escola', 'hotel', 'empresa'], faro: ['nova', 'rede'],
      dor: 'Quando a internet da {empresa} cai, quanto de venda para junto?', valor: 'Internet empresarial com suporte rápido e link reserva.', gancho: 'internet que não para a venda', pedido: 'Posso te mandar uma proposta pra {empresa}?' },
    { re: /personal|nutri|psic[oó]log|terapeut|fisioterap|massag|yoga|pilates/i, oferta: 'saúde e bem-estar pra empresas', alvos: ['empresa', 'escritorio', 'escola', 'academia', 'clinica', 'industria'], faro: ['rede'],
      dor: 'A equipe da {empresa} tá rendendo ou tá cansada e com dor nas costas?', valor: 'Levo bem-estar pra dentro da empresa, com hora marcada e sem tirar ninguém do trabalho.', gancho: 'equipe com mais energia', pedido: 'Posso te mandar uma proposta pra equipe da {empresa}?' }
  ];
  const DIGITAL_RE = /social|m[ií]dia|marketing|site|tr[aá]fego|design|conte[uú]do|ag[eê]ncia|ads|instagram|branding|identidade visual|seo|loja virtual|e-?commerce/i;
  const slug = s => C.norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'nicho';
  /* sem IA: o catálogo faz o básico (e o preset de agência quando é digital) */
  function montarLocal(frase){
    const PRE = window.CORRE_HORUS_PRESETS || {};
    const of0 = String(frase).trim().replace(/^(eu\s+)?(vendo|fa[cç]o|trabalho com|sou|ofere[cç]o|instalo|presto)\s+/i, '').replace(/[.!]+$/, '').slice(0, 60);
    if(DIGITAL_RE.test(frase) && !/tatua|tattoo|tatuad/i.test(frase) && PRE.padrao) return { origem: 'modelo', oferta: of0 || PRE.padrao.oferta, nichos: PRE.padrao.nichos, tpl: PRE.padrao.tpl, faro: ['sem_site', 'sem_insta', 'sem_horario', 'so_fixo', 'nova'] };
    const a = ARQ.find(x => x.re.test(frase)) || { oferta: of0 || 'o que eu vendo', alvos: ['comida', 'loja', 'estetica', 'clinica', 'escritorio', 'academia', 'auto'], faro: ['nova', 'rede'],
      dor: 'Como a {empresa} resolve isso hoje?', valor: `Eu trabalho com ${of0 || 'isso'} e posso facilitar esse lado pra vocês.`, gancho: 'uma ideia rápida pra vocês', pedido: 'Posso te mandar uma proposta pensada pra {empresa}?' };
    const oferta = a.re ? (of0.length >= 4 && of0.length <= 50 ? of0 : a.oferta) : a.oferta;
    const nichos = a.alvos.filter(k => NB[k]).map((k, i) => ({ k, n: NB[k][0], prio: i < 2 ? 'hot' : i < 5 ? 'warm' : 'cold', re: NB[k][2], osm: NB[k][1], hook: a.dor, valor: a.valor, gancho: a.gancho }));
    nichos.push({ k: 'outros', n: 'Outros', prio: 'cold', re: '', hook: a.dor, valor: a.valor, gancho: a.gancho });
    const tpl = {
      abordagem: `{oi} Aqui é {eu}, ${'{oferta}'} de {minha_cidade}.\n{sinal}\n\n{hook} {valor}\n\n${a.pedido}`,
      retomar: '{oi} {eu} de novo. Resumindo numa linha: {gancho}. Te mando por aqui?',
      mostra: '{oi} Pra você ver como funciona na prática: {link}\n\nSe fizer sentido pra {empresa}, a gente conversa 15 minutos essa semana. Qual dia fica melhor?',
      ultimo: '{oi} Último toque pra não virar chato: se agora não é o momento, tranquilo. Quando quiser, é só me chamar aqui. Valeu! {eu}',
      interesse: '{oi} Que bom! Qual o melhor horário pra uma conversa rápida? Já levo uma proposta pensada pra {empresa}.',
      link: 'Fechado! Segue o link pra gente começar: {link}\n\nQualquer coisa, me chama aqui.'
    };
    return { origem: 'modelo', oferta, nichos, tpl, faro: a.faro };
  }
  /* a resposta da IA vem crua: limpa, limita e põe no formato do Hórus */
  function daIA(r){
    const S = Z.SINAIS, okOsm = f => f && /^(shop|office|amenity|craft|leisure|healthcare|tourism|industrial|man_made)$/.test(f.chave) && (f.op === '=' || f.op === '~') && /^[\^]?[a-z0-9_|()$^]{1,120}$/.test(String(f.valor || ''));
    const vistos = new Set();
    const nichos = (Array.isArray(r.nichos) ? r.nichos : []).slice(0, 12).map(n => {
      let k = slug(n.n); while(vistos.has(k)) k += '_'; vistos.add(k);
      return { k, n: String(n.n || '').slice(0, 40), prio: ['hot', 'warm', 'cold'].includes(n.prio) ? n.prio : 'warm', re: String(n.palavras || '').replace(/[^\p{L}\p{N} |\-\[\]?ç]/gu, '').slice(0, 300),
        osm: (Array.isArray(n.osm) ? n.osm : []).filter(okOsm).slice(0, 4).map(f => [f.chave, f.op, String(f.valor)]), hook: String(n.hook || '').slice(0, 300), valor: String(n.valor || '').slice(0, 300), gancho: String(n.gancho || '').slice(0, 160) };
    }).filter(n => n.n);
    if(!nichos.some(n => /^outro/.test(n.k))) nichos.push({ k: 'outros', n: 'Outros', prio: 'cold', re: '', hook: (nichos[0] || {}).hook || '', valor: (nichos[0] || {}).valor || '', gancho: (nichos[0] || {}).gancho || '' });
    const T = r.tpl || {}, tpl = {}; ['abordagem', 'retomar', 'mostra', 'ultimo', 'interesse', 'link'].forEach(k => { if(T[k]) tpl[k] = String(T[k]).slice(0, 1200); });
    return { origem: 'ia', oferta: String(r.oferta || '').slice(0, 80), nichos, tpl, faro: (Array.isArray(r.faro) ? r.faro : []).filter(k => S[k]) };
  }
  async function montar(frase){
    if(!C.DEMO){
      try{
        const c = Z.cfg(), r = await C.iaFn({ acao: 'montar', frase, cidade: c.cidade }, { oque: 'um radar montado pela IA' });
        if(r && Array.isArray(r.nichos) && r.nichos.length >= 3) return daIA(r);
      }catch(e){ MX.iaErro = e; }
    }
    return montarLocal(frase);
  }
  function previaHTML(m){
    const ex = (m.tpl.abordagem || '').replace(/\{oi\}/g, 'Bom dia!').replace(/\{eu\}/g, Z.cfg().eu || 'Eu').replace(/\{oferta\}/g, m.oferta).replace(/\{minha_cidade\}/g, Z.cfg().cidade)
      .replace(/\{sinal\}/g, m.faro[0] && Z.SINAIS[m.faro[0]] ? `Dei uma olhada na Padaria Sol e ${Z.SINAIS[m.faro[0]].frase.replace(/\{empresa\}/g, 'Padaria Sol')}.` : '')
      .replace(/\{hook\}/g, (m.nichos[0] || {}).hook || '').replace(/\{valor\}/g, (m.nichos[0] || {}).valor || '').replace(/\{gancho\}/g, (m.nichos[0] || {}).gancho || '')
      .replace(/\{empresa\}/g, 'Padaria Sol').replace(/\{nicho\}/g, String((m.nichos[0] || {}).n || '').toLowerCase()).replace(/\{cidade\}/g, Z.cfg().cidade).replace(/\{link\}/g, '(teu link)').replace(/\n{3,}/g, '\n\n');
    return `<div class="mx-prev">
      <p class="mx-orig">${m.origem === 'ia' ? `${ico('star')} Montado pela IA` : 'Montado pelo Hórus (sem IA)'} · <b>${esc(m.oferta)}</b></p>
      <h3 class="hz-sub">Pra quem vender</h3>
      <div class="mx-nichos">${m.nichos.filter(n => n.k !== 'outros').map(n => `<span class="hz-sc ${n.prio}">${esc(n.n)}${(n.osm || []).length ? ` <small>${ico('pin')}</small>` : ''}</span>`).join('')}</div>
      <h3 class="hz-sub">Faro: o que mostra que a empresa precisa</h3>
      <div class="mx-nichos">${m.faro.map(k => `<span class="hz-sinal on">${esc(Z.SINAIS[k].n)}</span>`).join('') || '<span class="hint">nenhum sinal público</span>'}</div>
      <h3 class="hz-sub">A primeira mensagem</h3>
      <pre class="mx-msg">${esc(ex.trim())}</pre>
      <div class="acts"><button type="button" class="btn pri" data-act="mx-usar">Usar esse Hórus</button><button type="button" class="btn" data-act="mx-refazer">Refazer</button></div>
      <p class="hint">Troca os nichos, o faro e as mensagens. Teus leads não mudam. Dá pra ajustar tudo depois em Ajustar.</p></div>`;
  }
  function montarSheet(pre){
    const EX = ['instalo energia solar pra comércio', 'sou contador de pequenas empresas', 'faço social media pra restaurantes', 'vendo uniformes pra academias e clínicas', 'sistema de agendamento pra salões', 'faço bolo e coffee break pra empresas'];
    C.sheet(`<form class="form mx" id="mx-f"><div class="sheet-head"><h2>Monta o Hórus pra mim</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Conta numa frase o que você vende e pra quem. O Hórus monta pra quem vender, onde caçar no mapa, a dor de cada nicho, o faro e as mensagens.</p>
      <div class="fld"><label for="mx-q">O que você vende?</label><textarea class="inp" id="mx-q" rows="2" maxlength="300" placeholder="Ex.: instalo energia solar pra comércio" autofocus>${esc(pre || Z.cfg().montado || '')}</textarea></div>
      <div class="chips mx-ex">${EX.map(t => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="acts"><button type="submit" class="btn pri" id="mx-go">${ico('star')} Montar</button></div>
      <div id="mx-out" aria-live="polite"></div></form>`);
    const f = C.$('mx-f');
    f.querySelectorAll('.mx-ex .chip').forEach(b => b.addEventListener('click', () => { C.$('mx-q').value = b.dataset.t; C.$('mx-q').focus(); }));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const q = C.$('mx-q').value.trim(); if(q.length < 6){ C.toast('Conta um pouco mais do que você vende.'); return; }
      const b = C.$('mx-go'); b.disabled = true; b.textContent = 'Montando…'; C.$('mx-out').innerHTML = '<p class="hint">O Hórus tá pensando em quem compra isso…</p>';
      try{ MX.m = await montar(q); MX.frase = q; if(C.$('mx-out')) C.$('mx-out').innerHTML = previaHTML(MX.m); }
      catch(err){ C.toast(C.errMsg(err)); }
      finally{ if(C.$('mx-go')){ C.$('mx-go').disabled = false; C.$('mx-go').innerHTML = `${ico('star')} Montar de novo`; } }
    });
  }

  /* ============================== 2. SPRINT DE 15 MINUTOS ============================== */
  const SP = { on: false, fim: 0, fila: [], i: 0, feitos: 0, t: 0, dx: 0, ini: 0 };
  const DUR = 15 * 60e3;
  function filaSprint(){
    const sc = Z.scored().filter(o => Z.digits(o.l) && Z.nextMsg(o.l) && !SP.feitosIds.has(o.l.id));
    return sc.sort((a, b) => ((Z.pediuLink(b.l) || Z.escolheuMural(b.l)) - (Z.pediuLink(a.l) || Z.escolheuMural(a.l))) || (b.due - a.due) || (b.h - a.h)).map(o => o.l).slice(0, 300);
  }
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function recorde(){ const s = Z.cfg().sprint || {}; return +s.rec || 0; }
  function seguidos(){
    const dias = (Z.cfg().sprint || {}).dias || []; let n = 0, d = Z.today();
    if(!dias.includes(d)) d = Z.addDays(-1);
    while(dias.includes(d) && n < 400){ n++; d = Z.addDays(-1, d); }
    return n;
  }
  function cardHTML(l){
    const m = Z.nextMsg(l), txt = Z.compose(l, m.k), h = Z.heat(l), c = Z.cfg();
    const fora = l.uf && Z.tzDe(l.uf) !== Z.tzDe(c.uf || 'SP') ? (x => ` · lá são ${x.h}h${String(x.m).padStart(2, '0')}`)(Z.horaEm(l.uf)) : '';
    return `<div class="sp-card" id="sp-card" data-id="${l.id}">
      <div class="sp-head"><span class="hz-sc ${Z.tempOf(h)}">${h}</span><span class="sp-step">${esc(m.n)}</span><span class="sp-pos">${SP.i + 1} de ${SP.fila.length}</span></div>
      <h2>${esc(Z.shortName(l.nome))}</h2>
      <p class="sp-sub">${esc(Z.nichoOf(l).n)}${l.bairro ? ' · ' + esc(l.bairro) : ''}${l.cidade ? ' · ' + esc(Z.lugarTxt(l.cidade, l.uf)) : ''}${esc(fora)}</p>
      <p class="sp-why">${Z.reasons(l).map(esc).join(' · ')}</p>
      ${Z.faroDe(l).length ? `<div class="hz-sinais">${Z.faroDe(l).map(k => `<span class="hz-sinal on">${esc(Z.SINAIS[k].n)}</span>`).join('')}</div>` : ''}
      <textarea class="inp sp-txt" id="sp-txt" rows="6" aria-label="Mensagem">${esc(txt)}</textarea>
    </div>`;
  }
  function pinta(){
    const box = C.$('hz-sprint'); if(!box) return;
    const l = SP.fila[SP.i];
    const rest = SP.fim - Date.now();
    if(rest <= 0 || !l){ return fim(!l && rest > 0); }
    box.querySelector('#sp-body').innerHTML = cardHTML(l) + `<div class="sp-acts">
        <button type="button" class="btn" data-act="sp-pular" title="Pular (←)">Pular</button>
        <button type="button" class="btn" data-act="sp-nao" title="Não é cliente (N)">Não é cliente</button>
        ${l.wa ? '' : `<button type="button" class="btn" data-act="sp-liguei" title="Liguei (L)">Liguei</button>`}
        <a class="btn pri" id="sp-send" href="${esc(Z.waUrl(l, Z.compose(l, Z.nextMsg(l).k)))}" target="_blank" rel="noopener" data-act="sp-enviar" title="Enviar (→)">${ico('wa')} Enviar</a></div>
      <p class="sp-dica">Arrasta o card: → envia, ← pula. No teclado: → envia, ← pula, L liguei, N não é cliente.</p>`;
    const t = C.$('sp-txt'), send = C.$('sp-send');
    t.addEventListener('input', () => { send.href = Z.waUrl(l, t.value); });
    arrasta(C.$('sp-card'));
    placar();
  }
  function placar(){
    const box = C.$('hz-sprint'); if(!box) return;
    const rest = SP.fim - Date.now();
    box.querySelector('#sp-t').textContent = mmss(rest);
    box.querySelector('#sp-n').textContent = SP.feitos;
    box.querySelector('#sp-bar i').style.width = `${Math.min(100, (1 - rest / DUR) * 100).toFixed(1)}%`;
    if(rest <= 0 && !SP.acabou) fim(false);
  }
  function arrasta(card){
    if(!card) return;
    let x0 = null, id = null;
    card.addEventListener('pointerdown', e => { if(e.target.closest('textarea, a, button')) return; x0 = e.clientX; id = e.pointerId; card.setPointerCapture(id); card.classList.add('drag'); });
    card.addEventListener('pointermove', e => { if(x0 == null) return; SP.dx = e.clientX - x0; card.style.transform = `translateX(${SP.dx}px) rotate(${SP.dx / 30}deg)`; card.dataset.lado = SP.dx > 60 ? 'env' : SP.dx < -60 ? 'pul' : ''; });
    const solta = () => { if(x0 == null) return; const dx = SP.dx; x0 = null; SP.dx = 0; card.classList.remove('drag'); card.style.transform = ''; card.dataset.lado = '';
      if(dx > 110){ const a = C.$('sp-send'); if(a) a.click(); } else if(dx < -110) proximo(); };
    card.addEventListener('pointerup', solta); card.addEventListener('pointercancel', solta);
  }
  function proximo(){ SP.i++; pinta(); }
  function abrir(){
    if(C.$('hz-sprint')) return;
    SP.acabou = false; SP.feitosIds = new Set(); SP.fila = filaSprint(); SP.i = 0; SP.feitos = 0; SP.ini = Date.now(); SP.fim = Date.now() + DUR; SP.on = true;
    if(!SP.fila.length){ C.toast('Nenhum lead com WhatsApp pra disparar agora. Caça mais empresas antes.'); return; }
    const el = document.createElement('div'); el.id = 'hz-sprint'; el.className = 'sp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Sprint de 15 minutos');
    el.innerHTML = `<div class="sp-in"><header class="sp-top"><span class="sp-t" id="sp-t">15:00</span><span class="sp-n"><b id="sp-n">0</b> toques</span><span class="sp-rec">recorde <b>${recorde()}</b>${seguidos() ? ` · ${seguidos()} ${seguidos() === 1 ? 'dia' : 'dias'} seguidos` : ''}</span><button type="button" class="cbtn plain" data-act="sp-sair" aria-label="Sair do sprint">${ico('x')}</button></header>
      <div class="sp-bar" id="sp-bar"><i></i></div><div id="sp-body"></div></div>`;
    document.body.appendChild(el); document.body.classList.add('locked');
    pinta(); clearInterval(SP.t); SP.t = setInterval(placar, 500);
  }
  async function fim(acabou){
    /* uma vez só: antes o placar chamava o fim, que chamava o placar... e salvava o perfil sem parar */
    if(SP.acabou) return; SP.acabou = true;
    clearInterval(SP.t);
    const box = C.$('hz-sprint'); if(!box) return;
    const rec = recorde(), novo = SP.feitos > rec, min = Math.max(1, Math.round((Math.min(Date.now(), SP.fim) - SP.ini) / 60e3));
    if(SP.feitos){
      const s = Object.assign({}, Z.cfg().sprint || {}), dias = (s.dias || []).filter(d => d !== Z.today()).concat(Z.today()).slice(-60);
      try{ await Z.saveCfg({ sprint: { rec: Math.max(rec, SP.feitos), dias, ultimo: SP.feitos } }); }catch(e){}
    }
    box.querySelector('#sp-body').innerHTML = `<div class="sp-fim"><span class="mono">${acabou ? 'Fila zerada' : 'Tempo!'}</span>
      <h2><b>${SP.feitos}</b> ${SP.feitos === 1 ? 'toque' : 'toques'} em ${min} min</h2>
      <p>${novo ? 'Recorde novo. ' : rec ? `Teu recorde é ${rec}. ` : ''}${seguidos() > 1 ? `${seguidos()} dias seguidos de sprint.` : 'Amanhã tem mais.'}</p>
      <div class="acts"><button type="button" class="btn pri" data-act="sp-mais">Mais 15 minutos</button><button type="button" class="btn" data-act="sp-sair">Voltar pro radar</button></div></div>`;
    const t = C.$('sp-t'); if(t) t.textContent = '00:00';
  }
  function fechar(){ clearInterval(SP.t); SP.on = false; const el = C.$('hz-sprint'); if(el) el.remove(); if(C.$('sheet').hidden) document.body.classList.remove('locked'); Z.paint(); }
  document.addEventListener('keydown', e => {
    if(!C.$('hz-sprint') || /textarea|input/i.test(e.target.tagName)) { if(e.key === 'Escape' && C.$('hz-sprint')) fechar(); return; }
    if(e.key === 'ArrowRight'){ const a = C.$('sp-send'); if(a){ e.preventDefault(); a.click(); } }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); proximo(); }
    else if(/^l$/i.test(e.key)){ const b = document.querySelector('[data-act="sp-liguei"]'); if(b) b.click(); }
    else if(/^n$/i.test(e.key)){ const b = document.querySelector('[data-act="sp-nao"]'); if(b) b.click(); }
    else if(e.key === 'Escape') fechar();
  });

  /* ============================== 3. LEAD QUE VEM ATÉ VOCÊ ============================== */
  const linkOrc = h => `${location.origin}${location.pathname}#/orcamento/${encodeURIComponent(h)}`;
  function orcHTML(){
    const me = C.st.me || {}, c = Z.cfg(), on = (me.horus || {}).orcamento === 'on', url = linkOrc(me.handle || '');
    const pedidos = H.leads.filter(l => l.fonte === 'link').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const semana = pedidos.filter(l => l.created_at && (Date.now() - Date.parse(l.created_at)) < 7 * 864e5).length;
    /* v4.16: na Entrada do Hórus o card é só o link (a lista de quem pediu é a própria Entrada) */
    const naEntrada = !!C.horusFunil;
    return `<div class="hz-h"><h2>${naEntrada ? 'Teu link de orçamento' : 'Lead que vem até você'}</h2><span>${on ? `${semana} ${semana === 1 ? 'pedido' : 'pedidos'} na semana` : naEntrada ? 'desligado' : 'teu link de orçamento'}</span></div>
      ${on ? `${me.visibilidade === 'mocado' ? '<p class="hz-help warn">Teu perfil tá mocado: o link só funciona com o perfil na vitrine (Editar perfil).</p>' : ''}
        <div class="hz-orc-link"><code>${esc(url.replace(/^https?:\/\//, ''))}</code></div>
        <div class="hz-row-acts"><button type="button" class="hz-btn pri" data-act="mx-orc-copiar">${ico('copy')} Copiar o link</button><a class="hz-btn" href="https://wa.me/?text=${encodeURIComponent(`Pede teu orçamento por aqui, rapidinho: ${url}`)}" target="_blank" rel="noopener">${ico('wa')} Mandar no WhatsApp</a><a class="hz-btn" href="${esc(url)}" target="_blank" rel="noopener">${ico('ext')} Ver a página</a><button type="button" class="hz-btn ghost" data-act="mx-orc" data-k="off">Desligar</button></div>
        ${naEntrada ? '' : pedidos.length ? `<ol class="hz-list">${pedidos.slice(0, 4).map(l => `<li class="hz-row"><button type="button" class="hz-name" data-act="hz-open" data-id="${l.id}"><b>${esc(Z.shortName(l.nome))}</b><span>${esc(String(l.obs || '').replace(/^Pedido pelo link \([^)]*\):\s*/, '').split('\n')[0].slice(0, 90))}</span><span class="hz-why">${esc(Z.SN[l.st] || l.st)}${l.created_at ? ' · ' + C.rel(l.created_at) : ''}</span></button></li>`).join('')}</ol>` : '<p class="hz-muted">Quem pedir orçamento pelo link entra aqui como Interessado, no topo dos teus alvos. Põe na bio do Instagram, no status e na assinatura do WhatsApp.</p>'}`
      : `<p class="hz-help">Um link pra pôr na bio, no status e na assinatura do WhatsApp. Quem pede orçamento cai direto no Hórus como <b>Interessado</b>, ${naEntrada ? 'aqui na Entrada, com o pedido anotado, e o teu celular avisa na hora' : 'no topo dos teus alvos do dia, com o pedido anotado'}.</p>
        <div class="hz-row-acts"><button type="button" class="hz-btn pri" data-act="mx-orc" data-k="on">${ico('plus')} Ligar meu link de orçamento</button></div>`}`;
  }
  /* fotos de referência no pedido: o texto muda com o corre de quem recebe */
  const REF_FOTO = {
    tattoo: ['Referência e lugar do corpo', 'A arte que você curtiu e uma foto de onde quer fazer. Ajuda a orçar o tamanho certo.'],
    comida: ['Foto de referência', 'Um bolo ou doce que você curtiu, o tema da festa…'],
    beleza: ['Foto de referência', 'O corte, a unha ou o resultado que você quer.'],
    reforma: ['Foto do lugar', 'Mostra o que precisa ser feito: ajuda a orçar certo.'], tecnica: ['Foto do aparelho ou do lugar', 'Mostra o problema: ajuda a orçar certo.'], casa: ['Foto do lugar', 'Mostra o que precisa ser feito.'],
    eventos: ['Foto de referência', 'Uma decoração que você curtiu, o espaço da festa…'], moda: ['Foto de referência', 'A peça, a estampa ou o modelo que você quer.']
  };
  const FOTO_MAX = 3;
  /* reduz no navegador e vira JPEG em base64 (o banco aceita até ~300 KB por foto) */
  async function fotoRef(file){
    for(const [px, q] of [[900, .7], [700, .6], [520, .55]]){
      const b = await C.shrink(file, px, q);
      const u = await new Promise((ok, fail) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = fail; fr.readAsDataURL(b); });
      if(u.length <= 390000) return u;
    }
    throw { code: 'grande' };
  }
  /* a página pública */
  C.views.orcamento = async function(app, handle){
    const [hRaw, qs] = String(handle || '').split('?'), itemSel = new URLSearchParams(qs || '').get('item') || '';
    const h = hRaw.replace(/^@/, '').toLowerCase();
    app.innerHTML = `<main class="wrap orc"><section class="card"><p>Abrindo…</p></section></main>`;
    let p = null; try{ p = await C.api.one('corre_perfis', { eq: { handle: h } }); }catch(e){ p = null; }
    const cfg = (p && p.horus) || {};
    if(!p || cfg.orcamento !== 'on'){
      app.innerHTML = `<main class="wrap orc"><section class="card orc-card"><h1>Esse link de orçamento tá desligado.</h1><p class="note">Fala direto com a pessoa que te mandou o link.</p></section></main>`; return;
    }
    const nome = String(p.nome || h).split(' ')[0], oferta = p.faz || cfg.oferta || '', lugar = String(p.cidade || '');
    let itens = []; try{ const v = await C.api.rpc('corre_vitrine', { p: p.id }); itens = (v && v.itens) || []; }catch(e){}
    const quer = new Set(itens.some(i => i.id === itemSel) ? [itemSel] : []);
    document.title = `Orçamento com ${p.nome || h} · Corre`;
    const aberto = Date.now(), refTxt = REF_FOTO[p.categoria] || ['Fotos de referência', 'Uma imagem ajuda a entender o que você quer.'], fotos = [];
    app.innerHTML = `<main class="wrap orc"><section class="card orc-card">
      <div class="orc-quem">${p.avatar_url ? `<img class="orc-av" src="${esc(p.avatar_url)}" alt="">` : `<span class="orc-av mono-g"><b>${esc(C.initials ? C.initials(p.nome || h) : nome[0])}</b></span>`}<div><span class="mono">Pedido de orçamento</span><h1>${esc(p.nome || h)}</h1><p>${esc([oferta, lugar].filter(Boolean).join(' · '))}</p></div></div>
      <form class="form" id="orc-f" autocomplete="on" novalidate>
        <div class="row2"><div class="fld"><label for="orc-n">Teu nome</label><input class="inp" id="orc-n" name="name" autocomplete="name" maxlength="80" required></div><div class="fld"><label for="orc-e">Empresa <small>(se tiver)</small></label><input class="inp" id="orc-e" name="organization" autocomplete="organization" maxlength="120"></div></div>
        <div class="row2"><div class="fld"><label for="orc-w">WhatsApp</label><input class="inp" id="orc-w" name="tel" autocomplete="tel" inputmode="tel" placeholder="(DDD) 9 9999-9999" required></div>
          <div class="fld"><label for="orc-c">Cidade</label><div class="seguir-row"><input class="inp" id="orc-c" maxlength="60" autocomplete="address-level2"><select class="inp sm" id="orc-u" aria-label="Estado"><option value="">UF</option>${Z.UFS.map(([k]) => `<option>${k}</option>`).join('')}</select></div></div></div>
        ${itens.length ? `<div class="fld"><span class="lbl-s">O que você quer? <small>(toca pra escolher)</small></span><div class="orc-itens">${itens.map(i => `<button type="button" class="orc-it${/^(https:\/\/|data:image\/jpeg;base64,)/.test(i.foto_url || '') ? ' com-foto' : ''}" data-orc-it="${esc(i.id)}" aria-pressed="${quer.has(i.id)}">${/^(https:\/\/|data:image\/jpeg;base64,)/.test(i.foto_url || '') ? `<img src="${esc(i.foto_url)}" alt="" loading="lazy">` : ''}<b>${esc(i.nome)}</b>${i.preco != null ? `<span class="num">${C.money(i.preco)}${i.unidade ? ' / ' + esc(i.unidade) : ''}</span>` : ''}</button>`).join('')}</div></div>` : ''}
        <div class="fld"><label for="orc-m">${itens.length ? 'Conta mais (quantidade, data, onde…)' : 'O que você precisa?'}</label><textarea class="inp" id="orc-m" rows="4" maxlength="600" placeholder="${p.categoria === 'tattoo' ? 'Tamanho mais ou menos, lugar do corpo, colorida ou preto e cinza, pra quando…' : 'Conta rapidinho o que você quer, pra quando e o que for importante.'}"></textarea></div>
        <div class="fld orc-fotos-f"><span class="lbl-s">${esc(refTxt[0])} <small>(até ${FOTO_MAX} · opcional)</small></span><p class="hint">${esc(refTxt[1])}</p><div class="orc-fotos" id="orc-fotos"></div></div>
        <input type="text" id="orc-site" name="website" tabindex="-1" autocomplete="off" class="orc-mel" aria-hidden="true">
        <div class="acts"><button type="submit" class="btn pri" id="orc-ok">Pedir orçamento</button></div>
        <p class="fine">Teus dados vão só pra ${esc(nome)}, que te chama no WhatsApp. Feito com o Corre.</p>
      </form></section></main>`;
    const pintaFotos = () => { const box = C.$('orc-fotos'); if(!box) return; box.innerHTML = fotos.map((u, i) => `<span class="orc-ft"><img src="${u}" alt="Foto ${i + 1}"><button type="button" class="cbtn plain" data-orc-tira="${i}" aria-label="Tirar a foto ${i + 1}">${ico('x')}</button></span>`).join('') + (fotos.length < FOTO_MAX ? `<button type="button" class="orc-ft-add" id="orc-ft-add">${ico('camera')}<span>${fotos.length ? 'Mais uma' : 'Pôr foto'}</span></button>` : ''); };
    pintaFotos();
    C.$('orc-f').addEventListener('click', async e => {
      const t = e.target.closest('[data-orc-tira]'); if(t){ fotos.splice(+t.dataset.orcTira, 1); pintaFotos(); return; }
      if(e.target.closest('#orc-ft-add')){
        const f = await C.pickFile('image/*'); if(!f) return;
        const add = C.$('orc-ft-add'); if(add){ add.disabled = true; add.classList.add('subindo'); }
        try{ fotos.push(await fotoRef(f)); }catch(err){ C.toast(err && err.code === 'tipo' ? 'Escolhe uma imagem (JPG ou PNG).' : 'Essa foto não foi. Tenta outra.'); }
        pintaFotos(); return;
      }
      const b = e.target.closest('[data-orc-it]'); if(!b) return; const k = b.dataset.orcIt; if(quer.has(k)) quer.delete(k); else quer.add(k); b.setAttribute('aria-pressed', String(quer.has(k)));
    });
    C.$('orc-f').addEventListener('submit', async e => {
      e.preventDefault();
      const v = id => String(C.$(id).value || '').trim();
      if(v('orc-site')) return feito();
      if(Date.now() - aberto < 2500) return feito();
      const d = v('orc-w').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
      if(v('orc-n').length < 2){ C.toast('Coloca teu nome.'); C.$('orc-n').focus(); return; }
      if(d.length < 10 || d.length > 11){ C.toast('Coloca o WhatsApp com DDD.'); C.$('orc-w').focus(); return; }
      const b = C.$('orc-ok'); b.disabled = true; b.textContent = 'Enviando…';
      const escolhidos = itens.filter(i => quer.has(i.id)).map(i => i.nome), msg = (escolhidos.length ? 'Quero: ' + escolhidos.join(', ') + '. ' : '') + v('orc-m');
      const args = { h, nome: v('orc-n'), empresa: v('orc-e'), whats: d, cidade: v('orc-c'), uf: C.$('orc-u').value, msg: msg.slice(0, 600) };
      if(fotos.length) args.fotos = fotos.slice(0, FOTO_MAX);
      try{ await C.api.rpc('corre_pedir_orcamento', args); feito(); C.avisaPedido(); }
      catch(err){ const hnt = (err && (err.hint || err.message)) || ''; C.toast(/limite/.test(hnt) ? 'Muitos pedidos hoje. Tenta amanhã.' : /desligado/.test(hnt) ? 'Esse link foi desligado.' : 'Não deu pra enviar agora. Tenta de novo.'); b.disabled = false; b.textContent = 'Pedir orçamento'; }
    });
    function feito(){ app.innerHTML = `<main class="wrap orc"><section class="card orc-card orc-ok"><span class="mono">Pedido enviado</span><h1>Pronto! ${esc(nome)} vai te chamar no WhatsApp.</h1><p class="note">Se precisar mudar alguma coisa, é só mandar o pedido de novo com o mesmo número.</p></section></main>`; }
  };

  /* ============================== ganchos ============================== */
  MX.paint = function(){ const el = C.$('hz-orc'); if(el) el.innerHTML = orcHTML(); };
  MX.botoes = () => `<button type="button" class="hz-btn" data-act="mx-sprint" title="15 minutos de disparo, um lead por vez">${ico('clock')} Sprint 15 min</button><button type="button" class="hz-btn" data-act="mx-montar">${ico('star')} Montar com IA</button>`;
  MX.montarSheet = montarSheet; MX.montarLocal = montarLocal;
  Object.assign(C.acts, {
    'mx-montar': () => montarSheet(),
    'mx-refazer': () => { const f = C.$('mx-f'); if(f) f.requestSubmit(); },
    'mx-usar': async () => {
      const m = MX.m; if(!m) return;
      try{ await Z.saveCfg({ preset: m.origem === 'ia' ? 'ia' : 'montado', oferta: m.oferta, nichos: m.nichos, tpl: m.tpl, faro: m.faro, montado: MX.frase }); C.closeSheet(); C.toast('Hórus montado. Bora caçar.', 3200); C.views.horus(C.$('app')); }
      catch(e){ C.toast(C.errMsg(e)); }
    },
    'mx-sprint': () => abrir(),
    'sp-sair': () => fechar(),
    'sp-mais': () => { fechar(); abrir(); },
    'sp-pular': () => proximo(),
    /* v3.55: tecla segurada ou toque duplo não manda de novo pro mesmo (pulava o D2 e o próximo da fila) */
    'sp-enviar': () => { const l = SP.fila[SP.i]; if(!l || SP.feitosIds.has(l.id)) return; SP.feitosIds.add(l.id); SP.feitos++; C.acts['hz-fire']({ dataset: { id: l.id } }); setTimeout(proximo, 120); },
    'sp-liguei': () => { const l = SP.fila[SP.i]; if(!l) return; SP.feitosIds.add(l.id); SP.feitos++; C.acts['hz-call']({ dataset: { id: l.id } }); proximo(); },
    'sp-nao': async () => {
      const l = SP.fila[SP.i]; if(!l) return; SP.feitosIds.add(l.id);
      l.st = 'perdido'; l.prox = null; Z.logH(l, 'st', 'Etapa: Perdido (não é cliente)'); Z.save(l, ['st', 'prox', 'hist']); proximo();
    },
    'mx-orc': async el => {
      const on = el.dataset.k === 'on';
      try{ await Z.saveCfg({ orcamento: on ? 'on' : 'off' }); MX.paint(); C.toast(on ? 'Link ligado. Põe na bio e no status.' : 'Link desligado.'); }catch(e){ C.toast(C.errMsg(e)); }
    },
    'mx-orc-copiar': () => C.copy(linkOrc((C.st.me || {}).handle || ''), 'Link de orçamento copiado.')
  });
  /* v4.29: o Monta meu Corre usa a mesma montagem (IA, ou o modelo sem IA) */
  MX.montarIA = montar;
  C.horusMax = MX;
})();
