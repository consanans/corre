/* CORRE · QUANTOS CLIENTES TEM PRA VOCÊ (v4.29)
   O Thales: "quantos clientes tem no teu bairro? Aberta, sem login: escolhe o ramo e a cidade, vê o número e 3 exemplos;
   pra ver o resto, cria conta". É o Hórus virando a porta de entrada do Corre: quem vende pra empresa vê, antes de
   qualquer cadastro, quanta gente tem pra chamar na cidade dele (app.corresocial.com/clientes, que o começo do
   index.html troca pra #/clientes). O número sai do mapa aberto (OpenStreetMap, o mesmo da caça do Hórus), lido no
   aparelho de quem pergunta: sem login nada é gravado. Os exemplos mostram o telefone escondido.
   "Levar pro meu Hórus": sem login, guarda a pergunta no aparelho (corre-clientes-leva) e entra com o Google; logado,
   liga o Hórus e põe até 20 dessas empresas no radar (as de WhatsApp primeiro). Quem acabou de criar o perfil leva
   pelo Monta meu Corre (monta.js), que usa a mesma pergunta. */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, st = C.st;
  const K_LEVA = 'corre-clientes-leva', K_ULT = 'corre-clientes-ult';
  const Z = () => C.horus && C.horus._, T = () => C.horusTurbo;
  const NICHOS = () => (T() && T().NICHOS_ABERTOS) || [];
  const nomeN = k => (NICHOS().find(n => n[0] === k) || [k, k])[1];
  const ls = { get(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }, set(k, v){ try{ if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  const fmt = n => Number(n || 0).toLocaleString('pt-BR');
  const lugar = (o, comBairro) => `${comBairro && o.bairro ? o.bairro + ', ' : ''}${o.cidade}${o.uf ? '/' + o.uf : ''}`;
  const E = { o: null, r: null, busy: false, erro: '', levou: null };

  /* a pergunta que ficou guardada pra levar depois do login (vale 2 dias) */
  function leva(){ const o = ls.get(K_LEVA); return o && o.k && o.cidade && Date.now() - (o.em || 0) < 2 * 864e5 ? o : null; }
  const esquece = () => ls.set(K_LEVA, null);

  /* o telefone escondido: só o DDD e os dois últimos (pra ver o resto, entra) */
  function tapa(ph){
    if(!ph) return '';
    const d = String(ph.wa || ph.fixo || ''); if(d.length < 10) return '';
    return `(${d.slice(0, 2)}) ${d.length === 11 ? '9' : ''}••••-••${d.slice(-2)}`;
  }

  /* ---------- a demonstração: números de exemplo (os testes não falam com o mapa) ---------- */
  const EX_DEMO = {
    comida: ['Lanchonete Pé-Vermelho', 'Marmitaria da Vila', 'Pastel do Calçadão'], beleza: ['Barbearia Navalha Fina', 'Salão Cachos de Ouro', 'Esmalteria Rosa Choque'],
    saude: ['Clínica Sorriso Aberto', 'Fisio Movimento', 'Consultório Bem-Estar'], estetica: ['Espaço Pele de Seda', 'Estética Renova', 'Studio Lumière'],
    academia: ['Academia Força Total', 'Box Cross Norte', 'Studio Pilates Leve'], moda: ['Loja Avenida Moda', 'Calçados Passo Certo', 'Brechó da Esquina'],
    pet: ['Pet Shop Patinha', 'Clínica Vet Amigo Fiel', 'Banho e Tosa Au Au'], auto: ['Oficina do Tonho', 'Autopeças Rota Norte', 'Lava-Car Brilho'],
    cafe: ['Café da Praça', 'Cafeteria Grão Bom', 'Empório do Café'], imovel: ['Imobiliária Chave Certa', 'Lar Doce Imóveis', 'Casa Nova Imóveis'],
    educacao: ['Escola de Inglês Talk', 'Colégio Saber', 'Curso Passo à Frente'], escritorio: ['Contabilidade Exata', 'Advocacia Lima & Souza', 'Escritório Balanço'],
    obra: ['Material de Construção Tijolão', 'Ferragens do Bairro', 'Casa da Obra'], hotel: ['Hotel Ipê', 'Pousada Recanto', 'Hostel Centro'],
    eventos: ['Espaço Festa Boa', 'Salão Jardim', 'Casa de Eventos Aurora'], agro: ['Agropecuária Terra Roxa', 'Casa do Produtor', 'Agro Norte']
  };
  async function amostraDemo(o){
    await new Promise(r => setTimeout(r, 700));
    const h = C.hash(`${o.k}:${C.norm(o.cidade)}:${C.norm(o.bairro || '')}`), base = o.bairro ? 18 + h % 70 : 120 + h % 380;
    const tel = Math.round(base * (.55 + (h % 17) / 100)), wa = Math.round(tel * (.5 + (h % 13) / 100));
    const nomes = EX_DEMO[o.k] || EX_DEMO.comida, bairros = ['Centro', 'Vila Nova', 'Higienópolis', 'Jardim Bandeirantes'];
    const ex = nomes.map((n, i) => ({ nome: n + ' (exemplo)', cat: nomeN(o.k).split(/[ ,]/)[0].toLowerCase(), bairro: o.bairro || bairros[(h + i) % bairros.length], ph: i < 2 ? { wa: '43991' + String(100000 + (h + i * 7919) % 899999).slice(0, 6) } : { fixo: '4333' + String(100000 + h % 899999).slice(0, 6) }, insta: i === 1 ? '' : 'exemplo', sinais: i === 1 ? ['sem_insta', 'sem_site'] : ['sem_site'] }));
    return { total: base, lidas: base, tel, wa, semInsta: Math.round(base * .44), semSite: Math.round(base * .61), exemplos: ex, cidade: o.cidade, uf: o.uf, bairro: o.bairro, k: o.k };
  }
  async function cacaDemo(o){
    await new Promise(r => setTimeout(r, 600));
    const z = Z(); const k = Date.now().toString().slice(-5), nomes = EX_DEMO[o.k] || EX_DEMO.comida;
    const rows = Array.from({ length: Math.min(o.max || 20, 6) }, (_, i) => ({ nome: `${nomes[i % 3]} ${i + 1} (exemplo)`, nicho: o.k, bairro: o.bairro || 'Centro', insta: i % 2 ? '' : 'exemplo', end: '', ph: { wa: '4399' + k + String(i).padStart(2, '0'), fixo: '', fmt: '' }, sinais: ['sem_site'], cidade: o.cidade, uf: o.uf, fonte: 'caca' }));
    rows.forEach(r => { r.ph.fmt = z.fmtTel(r.ph.wa); });
    await z.addRows(rows, 'caca'); await z.load();
    return { lidas: rows.length, novas: rows.length, wa: rows.length };
  }

  /* ---------- a página ---------- */
  function topo(){
    if(st.me) return C.header('');
    document.body.classList.remove('com-lado');
    return `<div class="login-top"><nav class="topnav" aria-label="Navegação"><a class="hl" href="#/">Entrar</a><a class="hl" href="#/mural">Mural</a><a class="hl" href="privacidade.html">Privacidade</a></nav></div>`;
  }
  function form(){
    const o = E.o || ls.get(K_ULT) || {}, me = st.me || {}, z = Z();
    let cid = o.cidade, uf = o.uf;
    if(!cid && me.cidade && z){ const p = z.parseLugar(me.cidade); cid = p.cidade; uf = uf || p.uf; }
    return `<form class="card cl-f" id="cl-f" novalidate>
      <fieldset class="cl-fs"><legend>Quem você quer atender?</legend>
        <div class="cl-nichos" role="radiogroup" aria-label="Ramo">${NICHOS().map(([k, n]) => `<label class="cl-n"><input type="radio" name="cl-k" value="${esc(k)}"${o.k === k ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div></fieldset>
      <div class="cl-onde">
        <div class="fld"><label for="cl-uf">Estado</label><select class="inp" id="cl-uf"><option value="">UF</option>${(z ? z.UFS : []).map(([k, n]) => `<option value="${k}"${uf === k ? ' selected' : ''}>${k} · ${esc(n)}</option>`).join('')}</select></div>
        <div class="fld"><label for="cl-cid">Cidade</label><input class="inp" id="cl-cid" maxlength="60" value="${esc(cid || '')}" placeholder="Londrina" autocomplete="address-level2"></div>
        <div class="fld"><label for="cl-b">Bairro <small>(opcional)</small></label><input class="inp" id="cl-b" maxlength="60" value="${esc(o.bairro || '')}" placeholder="Centro, Gleba…" autocomplete="off"></div>
      </div>
      <button type="submit" class="btn pri cl-vai" id="cl-vai"${E.busy ? ' disabled' : ''}>${ico('lupa')} ${E.busy ? 'Olhando o mapa…' : 'Contar'}</button>
    </form>`;
  }
  function resultado(){
    const r = E.r;
    if(E.busy) return `<div class="card cl-r cl-esp" aria-busy="true"><span class="cl-radar" aria-hidden="true"></span><p>Olhando o mapa de ${esc(lugar(E.o, true))}…</p></div>`;
    if(E.erro) return `<p class="cl-erro" role="alert">${esc(E.erro)}</p>`;
    if(!r) return '';
    const n = nomeN(r.k).toLowerCase(), dias = r.wa ? Math.max(1, Math.ceil(r.wa / 10)) : 0, logado = !!st.me, quant = Math.min(20, r.wa || r.tel);
    const levou = E.levou;
    return `<div class="card cl-r" id="cl-r">
      <p class="cl-num"><b class="num" data-n="${r.total}">${fmt(r.total)}</b><span>${esc(n)} em ${esc(lugar(r, true))}</span></p>
      <ul class="cl-st">
        <li><b class="num">${fmt(r.tel)}</b><span>com telefone no mapa</span></li>
        <li class="cl-wa"><b class="num">${fmt(r.wa)}</b><span>com celular: dá pra chamar no WhatsApp</span></li>
        <li><b class="num">${fmt(r.semInsta)}</b><span>sem Instagram no mapa</span></li>
      </ul>
      ${dias ? `<p class="cl-ritmo">${ico('raio')}<span>Chamando 10 por dia, você fala com todos os de WhatsApp em <b>${dias} ${dias === 1 ? 'dia' : 'dias'}</b>. O Hórus monta a mensagem de cada um.</span></p>` : ''}
      ${r.exemplos.length ? `<h2 class="cl-h">Alguns deles</h2><ul class="cl-ex">${r.exemplos.map(x => `<li><b>${esc(x.nome)}</b><small>${esc([x.cat, x.bairro].filter(Boolean).join(' · '))}</small>
          <span class="cl-sinais">${x.ph ? `<span class="cl-tel">${ico(x.ph.wa ? 'wa' : 'cel')} ${esc(tapa(x.ph))}</span>` : '<span class="cl-tel off">sem telefone</span>'}${(x.sinais || []).includes('sem_site') ? '<span class="hz-sinal on">sem site</span>' : ''}${!x.insta ? '<span class="hz-sinal on">sem Instagram</span>' : ''}</span></li>`).join('')}</ul>` : ''}
      ${levou ? `<div class="cl-levou" role="status">${ico('check')}<span><b>${levou.novas ? `${levou.novas} ${levou.novas === 1 ? 'empresa foi' : 'empresas foram'} pro teu Hórus.` : 'Essas já tavam no teu Hórus.'}</b> ${levou.novas ? 'As de WhatsApp primeiro, cada uma com a mensagem pronta.' : ''}</span><a class="btn pri" href="#/horus">${ico('eye')} Abrir o Hórus</a></div>`
        : r.tel ? `<div class="cl-cta">
          <button type="button" class="btn pri" data-act="cl-leva">${ico('eye')} ${logado ? `Levar ${quant} pro meu Hórus` : `Entrar e levar ${quant} pro meu Hórus`}</button>
          <p class="fine">${logado ? 'Liga o Hórus e põe essas empresas no radar, com a primeira mensagem pronta.' : 'Entra com o Google, é grátis. O Hórus tem 30 dias de graça e monta a mensagem de cada empresa pra você.'}</p></div>` : ''}
      <div class="cl-manda"><button type="button" class="lnk" data-act="cl-manda">${ico('share')} Manda pra alguém que vende pra empresa</button></div>
      <p class="fine cl-fonte">Números do OpenStreetMap, o mapa aberto (© colaboradores do OpenStreetMap). Nem toda empresa tá no mapa: na rua costuma ter mais.</p>
    </div>`;
  }
  function pinta(app){
    app = app || $('app');
    const ja = $('cl-wrap');
    if(ja){ const r = $('cl-res'); if(r) r.innerHTML = resultado(); const b = $('cl-vai'); if(b){ b.disabled = E.busy; b.innerHTML = `${ico('lupa')} ${E.busy ? 'Olhando o mapa…' : 'Contar'}`; } contaSobe(); return; }
    app.innerHTML = topo() + `<main class="wrap cl" id="cl-wrap">
      <div class="hello cl-hero"><p class="cl-olho">${ico('eye')} Do Hórus, o radar de clientes do Corre</p>
        <h1 class="cl-t"><span class="hl">Quantos clientes tem pra você?</span></h1>
        <p class="cl-lead">Escolhe quem você quer atender e onde. O Corre olha o mapa da cidade e conta, sem cadastro.</p></div>
      ${form()}
      <div id="cl-res" aria-live="polite">${resultado()}</div>
    </main>`;
    $('cl-f').addEventListener('submit', e => { e.preventDefault(); conta(); });
    contaSobe();
  }
  /* o número grande sobe contando (sem animação pra quem pediu menos movimento) */
  function contaSobe(){
    const b = document.querySelector('.cl-num b[data-n]'); if(!b || b.dataset.subiu) return; b.dataset.subiu = '1';
    const alvo = Number(b.dataset.n) || 0; if(matchMedia('(prefers-reduced-motion: reduce)').matches || alvo < 10) return;
    const t0 = performance.now(), d = 900;
    const f = t => { const p = Math.min(1, (t - t0) / d), v = Math.round(alvo * (1 - Math.pow(1 - p, 3))); b.textContent = fmt(v); if(p < 1 && b.isConnected) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function leForm(){
    const k = (document.querySelector('input[name="cl-k"]:checked') || {}).value || '';
    return { k, uf: $('cl-uf').value, cidade: $('cl-cid').value.trim(), bairro: $('cl-b').value.trim() };
  }
  async function conta(o){
    if(E.busy) return;
    o = o || leForm();
    if(!o.k){ toast('Escolhe quem você quer atender.'); const p = document.querySelector('input[name="cl-k"]'); if(p) p.focus(); return; }
    if(!o.cidade){ toast('Diz a cidade.'); $('cl-cid').focus(); return; }
    if(!o.uf){ toast('Escolhe o estado (tem muita cidade com o mesmo nome).'); $('cl-uf').focus(); return; }
    E.o = o; E.busy = true; E.erro = ''; E.r = null; E.levou = null; ls.set(K_ULT, o); pinta();
    try{ E.r = C.DEMO ? await amostraDemo(o) : await T().amostra(o); }
    catch(e){
      E.erro = e && e.code === 'ocupado' ? 'O mapa tá ocupado agora. Tenta de novo em um minuto.' : e && e.code === 'bairro' ? `Não achei o bairro "${o.bairro}" em ${lugar(o)}. Confere o nome ou deixa em branco pra cidade toda.`
        : e && e.code === 'cidade' ? `Não achei ${lugar(o)} no mapa. Confere a cidade e o estado.` : (e && e.name === 'AbortError') ? 'O mapa demorou demais. Tenta um bairro.' : 'Não deu pra falar com o mapa agora. Confere a internet e tenta de novo.';
    }finally{ E.busy = false; pinta(); }
    if(E.r){ const r = $('cl-r'); if(r && r.scrollIntoView) r.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  }
  /* logado: liga o Hórus (se tiver desligado) e põe as empresas no radar */
  async function levaJa(o){
    const z = Z(); if(!z || !st.me) return null;
    if(!C.ferr('horus')){ await C.saveMe({ ferramentas: Object.assign({}, st.me.ferramentas || {}, { horus: true }) }); }
    const pr = z.cfg().praca; if(!pr.cidade && z.setPraca){ try{ await z.setPraca({ cidade: o.cidade, uf: o.uf, ddd: '' }); }catch(e){} }
    return C.DEMO ? await cacaDemo(Object.assign({ max: 20 }, o)) : await T().cacaNicho(Object.assign({ max: 20, assunto: 'Quantos clientes' }, o));
  }

  C.views.clientes = async (app) => {
    document.title = 'Quantos clientes tem pra você · Corre';
    /* voltou do login com a pergunta guardada: refaz a conta e já leva */
    const l = st.me ? leva() : null;
    if(l){ esquece(); E.o = l; pinta(app); await conta(l); if(E.r && E.r.tel) await C.acts['cl-leva'](); return; }
    pinta(app);
    if(!E.r && E.o && !E.busy) return;
  };
  Object.assign(C.acts, {
    'cl-leva': async el => {
      const o = E.o; if(!o || !E.r) return;
      if(!st.me){
        ls.set(K_LEVA, Object.assign({}, o, { em: Date.now() }));
        const g = C.acts.google; if(g) return g(el || {}); location.hash = '#/'; return;
      }
      if(el) { el.disabled = true; el.innerHTML = 'Levando…'; }
      try{ E.levou = await levaJa(o); pinta(); toast(E.levou && E.levou.novas ? `${E.levou.novas} empresas no teu Hórus.` : 'Essas já tavam no teu Hórus.'); }
      catch(e){ if(el){ el.disabled = false; el.innerHTML = `${ico('eye')} Tentar de novo`; } toast(e && e.code === 'ocupado' ? 'O mapa tá ocupado agora. Tenta de novo em um minuto.' : C.errMsg(e, 'Não deu pra levar agora.'), 4200); }
    },
    'cl-manda': async () => {
      const url = `${location.origin}/clientes`, txt = 'Quantos clientes tem pra você na tua cidade? O Corre conta sem cadastro:';
      if(navigator.share){ try{ await navigator.share({ title: 'Corre', text: txt, url }); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
      C.copy(url, 'Link copiado.');
    }
  });
  C.clientes = { leva, esquece, levaJa, nomeN, NICHOS, cacaDemo };
})();
