/* CORRE · MEU CORRE
   A pergunta que faltava: o que a pessoa vende, em que categoria, pra quem, e o WhatsApp do perfil.
   Fica no cadastro e no Editar perfil. Ao salvar, configura o resto do app de uma vez:
   o Hórus (monta pelo que ela vende, se ainda tava no modelo), o Mural ("Pra você"), a Banca (temas e
   assuntos do segmento), o link de orçamento e as sugestões do catálogo. Nada disso sobrescreve o que a
   pessoa já ajustou na mão. */
(function(){
  'use strict';
  const C = window.Corre, { esc } = C;
  /* por categoria: temas da Banca, assuntos pra seguir, e o começo do catálogo [nome, unidade, tipo] */
  const SEG = {
    social: { temas: ['publicidade', 'redes', 'tecnologia', 'design'], assuntos: ['marketing digital'], sug: [['Pacote social media', 'mês', 'servico'], ['Reels avulso', 'un', 'servico'], ['Criação de identidade', 'projeto', 'servico']] },
    design: { temas: ['design', 'publicidade', 'arte'], assuntos: ['identidade visual'], sug: [['Logo e identidade', 'projeto', 'servico'], ['Arte pra post', 'un', 'servico'], ['Cardápio', 'projeto', 'servico']] },
    foto_video: { temas: ['arte', 'publicidade', 'cinema'], assuntos: ['fotografia'], sug: [['Ensaio fotográfico', 'projeto', 'servico'], ['Diária de filmagem', 'diária', 'servico'], ['Reels editado', 'un', 'servico']] },
    site: { temas: ['tecnologia', 'negocios', 'design'], assuntos: ['desenvolvimento web'], sug: [['Site institucional', 'projeto', 'servico'], ['Landing page', 'projeto', 'servico'], ['Manutenção mensal', 'mês', 'servico']] },
    trafego: { temas: ['publicidade', 'redes', 'tecnologia', 'negocios'], assuntos: ['tráfego pago'], sug: [['Gestão de tráfego', 'mês', 'servico'], ['Setup de campanha', 'projeto', 'servico']] },
    musica: { temas: ['musica', 'cinema', 'negocios'], assuntos: ['mercado da música'], sug: [['Show ou set', 'un', 'servico'], ['Produção de faixa', 'un', 'servico'], ['Jingle', 'projeto', 'servico']] },
    eventos: { temas: ['negocios', 'comida', 'design'], assuntos: ['eventos'], sug: [['Decoração de festa', 'un', 'servico'], ['Cerimonial', 'projeto', 'servico'], ['Recreação', 'hora', 'servico']] },
    reforma: { temas: ['negocios', 'design'], assuntos: ['construção civil'], sug: [['Diária', 'diária', 'servico'], ['Visita técnica', 'un', 'servico'], ['Pintura', 'm²', 'servico']] },
    tecnica: { temas: ['tecnologia', 'negocios'], assuntos: ['assistência técnica'], sug: [['Visita técnica', 'un', 'servico'], ['Instalação', 'un', 'servico'], ['Manutenção preventiva', 'un', 'servico']] },
    aulas: { temas: ['negocios', 'tecnologia'], assuntos: ['educação'], sug: [['Aula avulsa', 'hora', 'servico'], ['Pacote mensal', 'mês', 'servico'], ['Mentoria', 'hora', 'servico']] },
    beleza: { temas: ['negocios', 'redes'], assuntos: ['estética'], sug: [['Corte', 'un', 'servico'], ['Manicure', 'un', 'servico'], ['Pacote noiva', 'pacote', 'servico']] },
    tattoo: { temas: ['arte', 'design', 'streetwear', 'musica'], assuntos: ['tatuagem'], sug: [['Tattoo pequena (até 5 cm)', 'un', 'servico'], ['Sessão', 'hora', 'servico'], ['Flash', 'un', 'servico'], ['Retoque', 'un', 'servico'], ['Piercing', 'un', 'servico']] },
    moda: { temas: ['streetwear', 'negocios', 'design'], assuntos: ['moda'], sug: [['Camiseta estampada', 'un', 'produto'], ['Ajuste de roupa', 'un', 'servico'], ['Uniforme', 'un', 'produto']] },
    comida: { temas: ['comida', 'negocios'], assuntos: ['gastronomia'], sug: [['Bolo de aniversário', 'kg', 'produto'], ['Cento de docinhos', 'cento', 'produto'], ['Coffee break', 'pessoa', 'servico'], ['Marmita', 'un', 'produto']] },
    frete: { temas: ['negocios', 'tecnologia'], assuntos: ['logística'], sug: [['Frete na cidade', 'un', 'servico'], ['Mudança', 'un', 'servico']] },
    juridico: { temas: ['negocios', 'tecnologia'], assuntos: ['pequenas empresas'], sug: [['Abertura de MEI', 'un', 'servico'], ['Contabilidade mensal', 'mês', 'servico'], ['Consulta', 'hora', 'servico']] },
    casa: { temas: ['negocios'], assuntos: ['serviços domésticos'], sug: [['Faxina', 'diária', 'servico'], ['Jardinagem', 'un', 'servico'], ['Passeio com cachorro', 'un', 'servico']] },
    outros: { temas: ['negocios', 'redes'], assuntos: [], sug: [] }
  };
  /* refinos do assunto pela frase (confeitaria, barbearia…) */
  const ASSUNTO_RE = [[/bolo|doce|confeit/i, 'confeitaria'], [/barb/i, 'barbearia'], [/cabel|sal[aã]o/i, 'salão de beleza'], [/solar/i, 'energia solar'], [/pet|cachorro|gato/i, 'mercado pet'], [/caf[eé]/i, 'cafeteria'], [/hamb[uú]rg|lanche/i, 'hamburgueria'], [/casamento|noiva/i, 'casamento'], [/piercing/i, 'piercing'], [/fine ?line|blackwork|old ?school|realismo/i, 'tatuagem autoral']];
  const CATS = () => (C.mural && C.mural.CATS) || [];
  const catNome = k => (CATS().find(c => c[0] === k) || [])[1] || '';
  const catDe = t => (C.mural && C.mural.catDe(t)) || '';
  const sugestoes = k => (SEG[k] || {}).sug || [];

  /* os campos (cadastro e Editar perfil) */
  function campos(v){
    const cat = v.categoria || '', orcOn = !v.horus || !v.horus.orcamento || v.horus.orcamento === 'on';
    return `<fieldset class="fld mc"><legend>Teu corre</legend>
      <div class="fld"><label for="f-faz">O que você vende, em uma frase</label><input class="inp" id="f-faz" maxlength="120" value="${esc(v.faz || '')}" placeholder="Bolos e doces pra festa e empresa · social media pra restaurante · conserto de ar"></div>
      <div class="fld"><span class="lbl-s" id="f-cat-l">Categoria <small id="f-cat-auto"></small></span><input type="hidden" id="f-cat" value="${esc(cat)}">
        <div class="hz-chips mc-cats" role="group" aria-labelledby="f-cat-l">${CATS().map(([k, n]) => `<button type="button" class="hz-chip light" data-act="mc-cat" data-k="${k}" aria-pressed="${k === cat}">${esc(n)}</button>`).join('')}</div></div>
      <div class="fld"><span class="lbl-s">Vende pra</span><div class="seg3" role="radiogroup" aria-label="Vende pra">${[['pessoas', 'Pessoas'], ['empresas', 'Empresas'], ['ambos', 'Os dois']].map(([k, n]) => `<label><input type="radio" name="f-vp" value="${k}"${(v.vende_pra || 'ambos') === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="row2"><div class="fld"><label for="f-wa">WhatsApp pra clientes <small>(opcional)</small></label><input class="inp" id="f-wa" inputmode="tel" autocomplete="tel" placeholder="(DDD) 9 9999-9999" value="${esc(fmt(v.whats_publico || ''))}"><span class="hint">Aparece no teu perfil com o botão "Chamar no WhatsApp".</span></div>
        <label class="switch mc-orc"><input type="checkbox" id="f-orc"${orcOn ? ' checked' : ''}><span class="sw"></span><span><b>Pedido de orçamento</b><small>Botão no perfil: o pedido cai no teu Hórus como Interessado.</small></span></label></div>
      <label class="switch mc-mural"><input type="checkbox" id="f-mural"${v.no_mural ? ' checked' : ''}><span class="sw"></span><span><b>Aparecer no Mural</b><small>Quando alguém perguntar no Mural por quem faz o que você faz, a IA pode te indicar (com o teu perfil, o que vende e a cidade). Precisa do perfil na vitrine.</small></span></label>
      <label class="switch mc-google"><input type="checkbox" id="f-google"${v.no_google ? ' checked' : ''}><span class="sw"></span><span><b>Aparecer no Google</b><small>Teu nome, o que você faz, a cidade, a foto e até 3 itens da vitrine entram na página aberta do teu ramo, que o Google mostra pra quem procura. <span id="f-google-u">${esc(googleTx(v))}</span></small></span></label>
    </fieldset>`;
  }
  /* v5.0 · Aparecer no Google: a página aberta de cada ramo (os mesmos endereços do ferramentas/seo/ramos.mjs). As páginas
     são de Londrina; quem é de fora aparece nelas nos ramos que dão pra fazer à distância */
  const GOOGLE = { social: 'social-media', design: 'design', foto_video: 'foto-e-video', site: 'site-e-app', trafego: 'trafego-pago', musica: 'musica-e-dj', eventos: 'eventos-e-festas',
    reforma: 'reforma-e-reparos', tecnica: 'assistencia-tecnica', aulas: 'aulas-e-consultoria', beleza: 'beleza-e-estetica', tattoo: 'tatuagem', moda: 'costura-e-moda',
    comida: 'comida-e-buffet', frete: 'frete-e-mudanca', juridico: 'contador-e-advogado', casa: 'limpeza-e-diarista' };
  const DIGITAL = ['social', 'design', 'site', 'trafego', 'aulas', 'juridico'];
  const cidadeK = t => String(t || '').split('/')[0].split(',')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const googleUrl = v => { const sl = v && GOOGLE[v.categoria]; return sl && (cidadeK(v.cidade) === 'londrina' || DIGITAL.includes(v.categoria)) ? `/londrina/${sl}/` : null; };
  function googleTx(v){
    if(!v || !v.categoria || v.categoria === 'outros') return 'Escolhe a categoria aí em cima pra saber onde você aparece.';
    const u = googleUrl(v); if(u) return `A tua: ${location.host}${u}`;
    return 'Por enquanto as páginas são de Londrina; no teu ramo, aparece quem é daqui. Liga mesmo assim: quando a tua cidade ganhar página, você já entra.';
  }
  const fmt = n => { const d = String(n || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };
  let manual = false;
  function bind(){
    manual = !!(C.$('f-cat') && C.$('f-cat').value);
    const faz = C.$('f-faz'); if(!faz) return;
    const cid = C.$('f-cidade'); if(cid) cid.addEventListener('input', googleRefaz);
    faz.addEventListener('input', () => {
      if(manual) return;
      const k = catDe(faz.value) || '';
      if(k && k !== C.$('f-cat').value){ marca(k); C.$('f-cat-auto').textContent = '· o Corre entendeu: ' + catNome(k); }
    });
  }
  function marca(k){ C.$('f-cat').value = k; document.querySelectorAll('[data-act="mc-cat"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); googleRefaz(); }
  const googleRefaz = () => { const u = C.$('f-google-u'), c = C.$('f-cat'); if(u && c) u.textContent = googleTx({ categoria: c.value, cidade: (C.$('f-cidade') || {}).value || '' }); };
  /* lê o que tá no formulário (null se o formulário não tem os campos) */
  function ler(){
    if(!C.$('f-faz')) return null;
    let w = String(C.$('f-wa').value || '').replace(/\D/g, ''); if(w.length > 11 && w.startsWith('55')) w = w.slice(2);
    return { categoria: C.$('f-cat').value || '', faz: C.$('f-faz').value.trim().slice(0, 120), vende_pra: (document.querySelector('input[name="f-vp"]:checked') || {}).value || 'ambos', whats_publico: w, orc: C.$('f-orc').checked, no_mural: !!(C.$('f-mural') && C.$('f-mural').checked), no_google: !!(C.$('f-google') && C.$('f-google').checked) };
  }
  const whatsOk = w => !w || w.length === 10 || w.length === 11;

  /* depois de salvar: espalha o "Meu corre" pelo app (só onde a pessoa ainda não mexeu) */
  async function aplicar(antes, orc){
    const me = C.st.me; if(!me) return;
    const mudou = !antes || antes.categoria !== me.categoria || antes.faz !== me.faz;
    const h = Object.assign({}, me.horus || {}), patch = {};
    if(orc != null && (orc ? 'on' : 'off') !== h.orcamento){ h.orcamento = orc ? 'on' : 'off'; patch.horus = h; }
    if(mudou && me.faz){
      if((!h.preset || h.preset === 'padrao' || h.preset === 'montado') && C.horusMax && C.horusMax.montarLocal){
        try{ const m = C.horusMax.montarLocal(me.faz); Object.assign(h, { preset: 'montado', oferta: m.oferta, nichos: m.nichos, tpl: m.tpl, faro: m.faro, montado: me.faz }); patch.horus = h; }catch(e){}
      }
      if(!h.mural || !h.mural.mexeu){
        const cats = Array.from(new Set([me.categoria].concat(C.mural ? C.mural.catsDe(me.faz) : []).filter(k => k && k !== 'outros'))).slice(0, 5);
        if(cats.length){ h.mural = { cats, area: (h.mural && h.mural.area) || 'cidade' }; patch.horus = h; }
      }
    }
    const seg = SEG[me.categoria];
    if(mudou && seg){
      if(!(me.banca_temas || []).length && seg.temas.length) patch.banca_temas = seg.temas;
      if(!(me.banca_assuntos || []).length){ const a = seg.assuntos.slice(); ASSUNTO_RE.forEach(([re, t]) => { if(re.test(me.faz || '') && !a.includes(t)) a.unshift(t); }); if(a.length) patch.banca_assuntos = a.slice(0, 3); }
    }
    if(Object.keys(patch).length){ try{ await C.saveMe(patch); }catch(e){} }
  }

  Object.assign(C.acts, {
    'mc-cat': el => { manual = true; marca(el.dataset.k); const a = C.$('f-cat-auto'); if(a) a.textContent = ''; }
  });
  C.meuCorre = { SEG, campos, bind, ler, aplicar, sugestoes, catNome, whatsOk, fmt, googleUrl, GOOGLE };
})();
