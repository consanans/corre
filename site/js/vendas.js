/* CORRE · CATÁLOGO (o que você vende)
   Cada produto ou serviço é da pessoa (a marca do Portfólio é opcional, pra quem revende), com preço,
   custo por venda, unidade, se é todo mês e se aparece no perfil. O banco calcula o "ganho" (preço − custo).
   Daqui saem: o card "O corre do mês" (quantas vendas faltam), o orçamento das Vendas, a vitrine do
   perfil e o "Quanto cobrar" (custo + horas × o valor da tua hora, que vem do teu estilo de vida). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico, money } = C;
  const V = { lista: null, marcas: [], at: 0, uid: '', refs: [] };
  const UNIDADES = ['un', 'kg', 'cento', 'caixa', 'pessoa', 'hora', 'diária', 'mês', 'projeto', 'pacote'];

  async function carregar(forca){
    if(!forca && V.lista && V.uid === C.uid() && Date.now() - V.at < 60e3) return V.lista;
    const [ps, ms, rs] = await Promise.all([
      C.api.q('corre_produtos', { eq: { dono: C.uid() }, order: ['created_at', true] }).catch(() => []),
      C.api.q('corre_portfolio', { eq: { dono: C.uid() }, order: ['ordem', true] }).catch(() => []),
      C.api.q('corre_refs', { eq: { dono: C.uid() }, limit: 500 }).catch(() => [])
    ]);
    V.marcas = ms; V.uid = C.uid(); V.at = Date.now(); V.refs = rs;
    const nome = Object.fromEntries(ms.map(m => [m.id, m.marca]));
    V.lista = ps.map(p => Object.assign({}, p, {
      preco: p.preco == null ? Number(p.ganho) || 0 : Number(p.preco), custo: Number(p.custo) || 0,
      ganho: Number(p.ganho) || 0, marca: p.marca_id ? nome[p.marca_id] || '' : '', tipo: p.tipo || 'servico', unidade: p.unidade || ''
    })).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.created_at).localeCompare(String(b.created_at)));
    return V.lista;
  }
  const invalidar = () => { V.at = 0; };
  const lista = () => V.lista || [];
  const daMarca = id => lista().filter(p => p.marca_id === id);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const porUn = p => p.unidade ? ` / ${p.unidade}` : p.mensal ? ' / mês' : '';
  const precoTxt = p => `${money(p.preco)}${porUn(p)}`;
  const margem = p => p.preco > 0 ? Math.round(p.ganho / p.preco * 100) : 0;
  const mercado = id => { const v = V.refs.filter(r => r.produto_id === id && Number(r.preco) > 0).map(r => Number(r.preco)).sort((a, b) => a - b); return v.length ? { min: v[0], max: v[v.length - 1], n: v.length, med: v[Math.floor(v.length / 2)] } : null; };

  /* quantas de cada pra cobrir o valor, e a melhor mistura das duas que mais rendem */
  function conta(alvo){
    const ps = lista().filter(p => p.ganho > 0);
    if(!(alvo > 0) || !ps.length) return null;
    const so = ps.map(p => ({ p, n: Math.ceil(alvo / p.ganho - 1e-9) })).sort((a, b) => a.n - b.n || b.p.ganho - a.p.ganho);
    let mix = null;
    const top = ps.slice().sort((a, b) => b.ganho - a.ganho).slice(0, 2);
    if(top.length === 2 && top[0].ganho < alvo){
      const [A, B] = top; let best = null;
      for(let x = 1; x * A.ganho < alvo && x <= 200; x++){
        const y = Math.max(1, Math.ceil((alvo - x * A.ganho) / B.ganho - 1e-9)), tot = x + y, gap = Math.abs(x - y);
        if(!best || tot < best.tot || (tot === best.tot && gap < best.gap)) best = { x, y, tot, gap };
      }
      if(best && best.tot <= so[0].n + 1) mix = { A, B, x: best.x, y: best.y };
    }
    return { so, mix };
  }
  function ritmo(n, dias){
    if(!dias || !n) return '';
    const r = n / dias;
    if(r >= 1) return `uns ${Math.ceil(r - 1e-9)} por dia útil`;
    const cada = Math.round(dias / n);
    return cada <= 1 ? 'uns 1 por dia útil' : `1 a cada ${cada} dias úteis`;
  }
  const un = (p, n) => p.mensal ? plural(n, 'cliente fixo', 'clientes fixos') : plural(n, 'venda', 'vendas');

  /* o bloco do card do mês: alvo = o que falta (estilo de vida ou meta, o maior) */
  function resumoHTML(o){
    const ps = lista();
    if(!ps.length){
      return `<div class="cm-vende vazio"><div class="cm-meta-top"><span class="mono">Quanto vender</span></div>
        <p class="cm-meta-tx">Põe o que você vende e quanto sobra em cada venda. O Corre transforma o que falta em <b>número de vendas</b>.</p>
        <button type="button" class="cm-meta-add" data-act="vd-novo">${ico('plus')} O que eu vendo</button></div>`;
    }
    const alvo = o.alvo, k = conta(alvo);
    if(!k){
      const melhor = ps.slice().sort((a, b) => b.ganho - a.ganho)[0];
      return `<div class="cm-vende"><div class="cm-meta-top"><span class="mono">Quanto vender</span><a class="lnk" href="#/marcas">${ico('edit')} O que eu vendo</a></div>
        <p class="cm-meta-tx">${esc(o.rotulo || 'O mês tá pago')}. Daqui pra frente cada <b>${esc(melhor.nome)}</b> é <b class="num">${money(melhor.ganho)}</b> a mais${melhor.mensal ? ' por mês' : ''}.</p></div>`;
    }
    const lin = k.so.slice(0, 4).map((x, i) => `<li${i ? '' : ' class="on"'}><b class="num">${x.n}×</b><span><b>${esc(x.p.nome)}</b><small>${esc(x.p.marca ? x.p.marca + ' · ' : '')}sobra ${money(x.p.ganho)}${x.p.mensal ? '/mês' : ' cada'}</small></span><em>${esc(ritmo(x.n, o.dias))}</em></li>`).join('');
    const top = k.so[0];
    return `<div class="cm-vende"><div class="cm-meta-top"><span class="mono">Quanto vender</span><a class="lnk" href="#/marcas">${ico('edit')} O que eu vendo</a></div>
      <p class="cm-meta-tx">Faltam <b class="num">${money(alvo)}</b> ${esc(o.rotulo || '')}. Fecha com <b>${un(top.p, top.n)} de ${esc(top.p.nome)}</b>${k.so.length > 1 ? ', ou com qualquer uma dessas:' : '.'}</p>
      ${k.so.length > 1 ? `<ol class="cm-vlist">${lin}</ol>` : ''}
      ${k.mix ? `<p class="cm-meta-st">Misturando: <b>${k.mix.x} × ${esc(k.mix.A.nome)}</b> + <b>${k.mix.y} × ${esc(k.mix.B.nome)}</b>.</p>` : ''}
      <p class="cm-meta-st" id="cm-hz-ritmo" data-n="${top.n}"></p>
    </div>`;
  }
  async function ritmoHorus(el){
    const box = el && el.querySelector('#cm-hz-ritmo'); if(!box || !C.horusTurbo || !C.horusTurbo.ritmo) return;
    try{
      const r = await C.horusTurbo.ritmo(); if(!r || !box.isConnected) return;
      const n = +box.dataset.n, t = Math.ceil(n * r);
      box.innerHTML = `No teu ritmo do Hórus (1 fechamento a cada ${Math.round(r)} toques): uns <b class="num">${t} toques</b> até o fim do mês. <a href="#/horus">Abrir o radar</a>`;
    }catch(e){}
  }

  /* ---------- a seção do Portfólio ---------- */
  /* foto do item: só https (Storage) — no modo demonstração, a imagem fica no próprio aparelho */
  const fotoOk = u => /^(https:\/\/|data:image\/jpeg;base64,)/.test(u || '');
  function itemHTML(p){
    const m = mercado(p.id);
    return `<li class="ct-it${fotoOk(p.foto_url) ? ' com-foto' : ''}">
      <button type="button" class="ct-main" data-act="vd-edit" data-id="${p.id}">${fotoOk(p.foto_url) ? `<img class="ct-th" src="${esc(p.foto_url)}" alt="" loading="lazy">` : ''}
        <span class="ct-tipo">${p.tipo === 'produto' ? 'Produto' : 'Serviço'}${p.mensal ? ' · todo mês' : ''}</span>
        <b>${esc(p.nome)}</b>
        <span class="ct-preco num">${precoTxt(p)}</span>
        <small>${p.custo > 0 ? `custo ${money(p.custo)} · ` : ''}sobra <b class="num">${money(p.ganho)}</b>${p.preco > 0 ? ` (${margem(p)}%)` : ''}${m ? ` · mercado ${money(m.min)}${m.max > m.min ? '–' + money(m.max) : ''}` : ''}</small>
      </button>
      <span class="ct-tags">${p.publico ? '<span class="tag pub">no perfil</span>' : '<span class="tag">só você vê</span>'}${p.marca ? `<span class="tag">${esc(p.marca)}</span>` : ''}</span>
    </li>`;
  }
  function secaoHTML(){
    const ps = lista();
    return `<div class="sec-row"><h2 class="sec-t"><span class="hl">O que eu vendo</span></h2><button type="button" class="btn sm pri" data-act="vd-novo">${ico('plus')} Produto ou serviço</button></div>
      ${ps.length ? `<ul class="ct-lista">${ps.map(itemHTML).join('')}</ul>
        <p class="ct-pe">${ps.filter(p => p.publico).length} no teu perfil · o que tá marcado "no perfil" aparece na tua vitrine com o botão de orçamento.</p>`
      : `<section class="card ct-vazio"><p><b>Teu catálogo tá vazio.</b> Põe o que você vende com preço e custo: daqui sai o orçamento, a vitrine do teu perfil e quantas vendas fecham o mês.</p>${sugestoesHTML()}</section>`}`;
  }
  /* sugestões pela categoria do "Meu corre" */
  function sugestoesHTML(){
    const me = C.st.me || {}, sug = (C.meuCorre && C.meuCorre.sugestoes(me.categoria)) || [];
    if(!sug.length) return '';
    return `<p class="fine">Começa por um destes (dá pra mudar tudo):</p><div class="chips">${sug.map(([n, u, t]) => `<button type="button" class="chip add" data-act="vd-novo" data-n="${esc(n)}" data-u="${esc(u)}" data-t="${t}">${ico('plus')} ${esc(n)}</button>`).join('')}</div>`;
  }

  /* ---------- a folha do item ---------- */
  async function itemSheet(p, pre){
    try{ await carregar(); }catch(e){}
    const novo = !p;
    p = p || { nome: (pre && pre.n) || '', tipo: (pre && pre.t) || 'servico', preco: '', custo: 0, unidade: (pre && pre.u) || '', mensal: false, publico: true, descricao: '', horas: null, marca_id: null };
    const info = C.estiloInfo ? await C.estiloInfo().catch(() => null) : null;
    const m = p.id ? mercado(p.id) : null;
    C.sheet(`<form class="form ct-f" id="ct-f" novalidate><div class="sheet-head"><h2>${novo ? 'O que você vende' : 'Editar'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="seg2" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="ct-tp" value="servico"${p.tipo !== 'produto' ? ' checked' : ''}><span>Serviço</span></label><label><input type="radio" name="ct-tp" value="produto"${p.tipo === 'produto' ? ' checked' : ''}><span>Produto</span></label></div>
      <div class="fld ct-foto-f"><span class="lbl-s">Foto <small>(opcional · aparece na vitrine)</small></span><input type="hidden" id="ct-fu" value="${esc(fotoOk(p.foto_url) ? p.foto_url : '')}" data-orig="${esc(p.foto_url || '')}"><div class="ct-foto" id="ct-foto"></div></div>
      <div class="fld"><label for="ct-n">Nome</label><input class="inp" id="ct-n" maxlength="80" required value="${esc(p.nome)}" placeholder="Bolo de aniversário, pacote de social media, diária…"${novo ? ' autofocus' : ''}></div>
      <div class="row2"><div class="fld"><label for="ct-p">Preço (R$)</label><input class="inp num" id="ct-p" inputmode="decimal" placeholder="0,00" value="${p.preco !== '' && p.preco != null ? esc(campo(p.preco)) : ''}"></div>
        <div class="fld"><label for="ct-u">Por</label><input class="inp" id="ct-u" maxlength="20" list="ct-ul" value="${esc(p.unidade)}" placeholder="un, kg, hora, mês…"><datalist id="ct-ul">${UNIDADES.map(u => `<option value="${u}">`).join('')}</datalist></div></div>
      <div class="row2"><div class="fld"><label for="ct-c">Custo por venda (R$)</label><input class="inp num" id="ct-c" inputmode="decimal" placeholder="0,00" value="${p.custo ? esc(campo(p.custo)) : ''}"><span class="hint">Material, insumo, taxa da maquininha, comissão.</span></div>
        <div class="fld"><label for="ct-h">Tempo por venda (horas)</label><input class="inp num" id="ct-h" inputmode="decimal" placeholder="opcional" value="${p.horas != null ? esc(String(p.horas).replace('.', ',')) : ''}"><span class="hint">Pro "quanto cobrar".</span></div></div>
      <div class="ct-conta" id="ct-conta" aria-live="polite"></div>
      <div class="fld"><label for="ct-d">Descrição <small>(aparece no perfil)</small></label><textarea class="inp" id="ct-d" rows="2" maxlength="300" placeholder="O que vem, tamanho, prazo…">${esc(p.descricao || '')}</textarea></div>
      <label class="switch"><input type="checkbox" id="ct-m"${p.mensal ? ' checked' : ''}><span class="sw"></span><span><b>Todo mês</b><small>Cliente fixo, assinatura, mensalidade: a cobrança se repete todo mês.</small></span></label>
      <label class="switch"><input type="checkbox" id="ct-pub"${p.publico ? ' checked' : ''}><span class="sw"></span><span><b>Mostrar no meu perfil</b><small>Nome, preço e descrição na tua vitrine. Custo e quanto sobra nunca aparecem.</small></span></label>
      ${V.marcas.length ? `<div class="fld"><label for="ct-mk">É de uma marca que você revende? <small>(opcional)</small></label><select class="inp" id="ct-mk"><option value="">Não, é meu</option>${V.marcas.map(x => `<option value="${x.id}"${x.id === p.marca_id ? ' selected' : ''}>${esc(x.marca)}</option>`).join('')}</select></div>` : ''}
      <div class="acts"><button type="submit" class="btn pri">${novo ? `${ico('plus')} Pôr no catálogo` : 'Salvar'}</button>${novo ? '' : `<button type="button" class="btn ghost" data-act="vd-del" data-id="${p.id}">${ico('trash')} Tirar</button>`}</div>
    </form>`);
    const calc = () => {
      const pr = parseReais(C.$('ct-p').value), cu = parseReais(C.$('ct-c').value), hr = parseReais(C.$('ct-h').value);
      const sobra = pr - cu, vh = info && info.valorHora > 0 ? info.valorHora : 0;
      const sug = vh && hr > 0 ? Math.ceil((cu + hr * vh) / 5) * 5 : 0;
      const linhas = [];
      if(pr > 0) linhas.push(`Sobra por venda: <b class="num">${money(Math.max(sobra, 0))}</b>${pr ? ` (${Math.max(0, Math.round(sobra / pr * 100))}%)` : ''}${sobra < 0 ? ' · <b>o custo passou do preço</b>' : ''}`);
      if(vh) linhas.push(hr > 0 ? `Quanto cobrar: tua hora vale <b class="num">${money(vh)}</b> (estilo de vida ÷ ${Math.round(info.horasMes)} h/mês). Custo + ${String(hr).replace('.', ',')} h = <b class="num">${money(sug)}</b> no mínimo.${pr > 0 && pr < sug ? ' <b>Teu preço tá abaixo disso.</b>' : pr >= sug && pr > 0 ? ' Teu preço cobre.' : ''} <button type="button" class="linklike" data-act="vd-usar" data-v="${sug}">usar ${money(sug)}</button>` : `Tua hora vale <b class="num">${money(vh)}</b>. Põe o tempo que leva e o Corre diz quanto cobrar no mínimo.`);
      else linhas.push(`<a href="#/grana">Monta teu estilo de vida</a> e o Corre calcula quanto vale tua hora e quanto cobrar no mínimo.`);
      if(m) linhas.push(`No mercado (${m.n} ${m.n === 1 ? 'referência' : 'referências'}): ${money(m.min)}${m.max > m.min ? ' a ' + money(m.max) : ''}.`);
      C.$('ct-conta').innerHTML = linhas.map(l => `<p>${l}</p>`).join('');
    };
    calc();
    pintaFoto();
    ['ct-p', 'ct-c', 'ct-h'].forEach(id => C.$(id).addEventListener('input', calc));
    C.umaVez(C.$('ct-f'), async e => {
      const nome = C.$('ct-n').value.trim().slice(0, 80), preco = parseReais(C.$('ct-p').value), custo = parseReais(C.$('ct-c').value), hr = C.$('ct-h').value.trim() ? parseReais(C.$('ct-h').value) : null;
      if(!nome){ C.toast('Diz o que você vende.'); C.$('ct-n').focus(); return; }
      if(!(preco > 0)){ C.toast('Coloca o preço.'); C.$('ct-p').focus(); return; }
      const row = { nome, preco, custo, ganho: Math.max(preco - custo, 0), tipo: (document.querySelector('input[name="ct-tp"]:checked') || {}).value || 'servico', unidade: C.$('ct-u').value.trim().slice(0, 20),
        descricao: C.$('ct-d').value.trim().slice(0, 300), horas: hr, mensal: C.$('ct-m').checked, publico: C.$('ct-pub').checked, marca_id: C.$('ct-mk') ? C.$('ct-mk').value || null : (p.marca_id || null), foto_url: C.$('ct-fu').value || '' };
      if(C.$('ct-foto').dataset.subindo === '1'){ C.toast('Espera a foto terminar de subir.'); return; }
      try{
        if(novo) await C.api.ins('corre_produtos', Object.assign(row, { ordem: lista().length }));
        else await C.api.upd('corre_produtos', { id: p.id }, row);
        if(p.foto_url && p.foto_url !== row.foto_url && C.api.unlink) C.api.unlink(p.foto_url);
        await carregar(true); C.closeSheet(); depois(); C.toast(novo ? `${nome} tá no catálogo.` : 'Salvo.');
      }catch(err){ C.toast(C.errMsg(err)); }
    });
  }
  function pintaFoto(){
    const box = C.$('ct-foto'), u = C.$('ct-fu') && C.$('ct-fu').value; if(!box) return;
    box.innerHTML = u ? `<img src="${esc(u)}" alt="Foto do item"><span class="ct-foto-acts"><button type="button" class="btn sm" data-act="ct-foto">${ico('camera')} Trocar</button><button type="button" class="btn sm ghost" data-act="ct-foto-x">${ico('x')} Tirar</button></span>`
      : `<button type="button" class="ct-foto-add" data-act="ct-foto">${ico('camera')}<span>Pôr uma foto<small>O trabalho pronto vende mais que a descrição.</small></span></button>`;
  }
  const campo = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* "1.234,56", "1234.56", "R$ 90" */
  function parseReais(s){
    let t = String(s || '').replace(/R\$|\s/g, '');
    if(!t) return 0;
    if(t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if(/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const v = Number(t); return isFinite(v) ? Math.round(v * 100) / 100 : 0;
  }
  /* depois de mudar: redesenha o que mostra o catálogo */
  function depois(){
    ['h-corre', 'g-corre'].forEach(id => { const el = C.$(id); if(el && C.correMes) C.correMes(el); });
    if(C.estiloRepinta) C.estiloRepinta();
    const sec = C.$('ct-sec'); if(sec) sec.innerHTML = secaoHTML();
    const pm = C.$('mk-vende'); if(pm) pm.innerHTML = painelHTML(pm.dataset.id);
  }
  /* bloco no painel da marca (quem revende) */
  function painelHTML(id){
    const it = daMarca(id);
    return `<h2 class="ch">O que você vende dessa marca</h2>${it.length ? `<ul class="vd-lista">${it.map(p => `<li><span><b>${esc(p.nome)}</b><small>${precoTxt(p)} · sobra ${money(p.ganho)}</small></span></li>`).join('')}</ul>` : '<p class="note">Põe no teu catálogo o que você vende dessa marca (em "É de uma marca que você revende?").</p>'}
      <div class="acts"><a class="btn sm" href="#/marcas">${ico('edit')} Meu catálogo</a></div>`;
  }

  Object.assign(C.acts, {
    'vd-novo': el => itemSheet(null, el && el.dataset && el.dataset.n ? { n: el.dataset.n, u: el.dataset.u, t: el.dataset.t } : null),
    'vd-escolhe': () => itemSheet(null),
    'vd-marca': () => { C.go('#/marcas'); },
    'vd-edit': async el => { try{ await carregar(); }catch(e){} const p = lista().find(x => x.id === el.dataset.id); if(p) itemSheet(p); },
    'vd-usar': el => { C.$('ct-p').value = campo(Number(el.dataset.v)); C.$('ct-p').dispatchEvent(new Event('input')); },
    'vd-del': async el => {
      const p = lista().find(x => x.id === el.dataset.id); if(!p) return;
      if(el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = 'Tirar do catálogo?'; return; }
      try{ await C.api.del('corre_produtos', { id: p.id }); if(p.foto_url && C.api.unlink) C.api.unlink(p.foto_url); await carregar(true); C.closeSheet(); depois(); C.toast('Tirado do catálogo.'); }catch(e){ C.toast(C.errMsg(e)); }
    },
    /* foto do item: escolhe, reduz (1000 px) e sobe. Foto trocada antes de salvar não fica largada no Storage */
    'ct-foto': async () => {
      const box = C.$('ct-foto'), fu = C.$('ct-fu'); if(!box || !fu) return;
      const f = await C.pickFile('image/*'); if(!f) return;
      box.dataset.subindo = '1'; box.classList.add('subindo');
      try{
        const url = await C.api.upload(await C.shrink(f, 1000, .82));
        if(fu.value && fu.value !== fu.dataset.orig && C.api.unlink) C.api.unlink(fu.value);
        fu.value = url; pintaFoto();
      }catch(e){ C.toast(e && e.code === 'tipo' ? 'Escolhe uma imagem (JPG ou PNG).' : 'Não deu pra subir a foto agora.'); }
      finally{ box.dataset.subindo = ''; box.classList.remove('subindo'); }
    },
    'ct-foto-x': () => { const fu = C.$('ct-fu'); if(!fu) return; if(fu.value && fu.value !== fu.dataset.orig && C.api.unlink) C.api.unlink(fu.value); fu.value = ''; pintaFoto(); }
  });

  C.vendas = { carregar, invalidar, resumoHTML, ritmoHorus, painelHTML, daMarca, escolhe: () => itemSheet(null), conta };
  C.catalogo = { carregar, invalidar, lista, secaoHTML, itemSheet, precoTxt, parseReais, campo, mercado, fotoOk, UNIDADES };
})();
