/* CORRE · as páginas abertas (v5.0, "Londrina no Google"): o que acontece quando alguém abre. A página já vem pronta
   (é o que o Google lê); aqui ela troca a lista pela de agora (quem ligou o Google depois do último zip aparece na hora),
   conta a visita e o toque (sem saber quem é) e manda o pedido pro Mural sem conta, pelo mesmo caminho do app. */
(function(){
  'use strict';
  const S = window.SEO || {}, R = window.SeoRender, cfg = window.CORRE_CONFIG || {};
  const URL_ = cfg.SUPABASE_URL, KEY = cfg.SUPABASE_ANON_KEY, $ = id => document.getElementById(id);
  const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
    .then(async r => { const j = await r.json().catch(() => null); if(!r.ok) throw (j || { message: 'http ' + r.status }); return j; });
  const pode = !!(URL_ && KEY && R);

  /* a conta: a visita uma vez por sessão por página; os toques, cada um */
  const marca = tipo => { if(pode && S.pagina) rpc('corre_seo_marca', { p_pagina: S.pagina, p_tipo: tipo }).catch(() => {}); };
  try{ const k = 'corre-seo-ver:' + S.pagina; if(!sessionStorage.getItem(k)){ sessionStorage.setItem(k, '1'); marca('ver'); } }catch(e){ marca('ver'); }
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-marca]'); if(a) marca(a.dataset.marca); });

  /* a foto que não abriu (apagada, fora do ar) vira as iniciais, em vez do ícone de imagem quebrada */
  const semFoto = i => { const s = document.createElement('span'); s.className = 'sx-av sx-av-i'; s.setAttribute('aria-hidden', 'true');
    const b = i.closest('.sx-p') && i.closest('.sx-p').querySelector('.sx-p-tx b'); s.textContent = R ? R.ini(b ? b.textContent : '?') : '?'; i.replaceWith(s); };
  document.addEventListener('error', e => { const i = e.target; if(i && i.matches && i.matches('img.sx-av')) semFoto(i); }, true);
  /* a que já tinha falhado antes deste arquivo chegar (ele vem com defer) */
  document.querySelectorAll('img.sx-av').forEach(i => { if(i.complete && !i.naturalWidth) semFoto(i); });

  /* a lista de agora */
  function pinta(d){
    if(!d || !Array.isArray(d.gente)) return;
    if(S.ramo){
      const x = R.doRamo(d, S.ramo), g = $('sx-gente'), l = $('sx-longe'), lw = $('sx-longe-w'), p = $('sx-pedidos');
      if(g) g.innerHTML = x.aqui.length ? x.aqui.map(q => R.cartao(q, S.ramo)).join('') : R.vazioGente(S.ramo, S.cidade);
      if(l && lw){ l.innerHTML = x.longe.map(q => R.cartao(q, S.ramo)).join(''); lw.hidden = !x.longe.length; }
      if(p) p.innerHTML = x.pedidos.length ? x.pedidos.slice(0, 12).map(R.pedido).join('') : R.vazioPedidos();
      const n = $('sx-n'); if(n) n.textContent = x.aqui.length ? `${x.aqui.length} ${x.aqui.length === 1 ? 'pessoa' : 'pessoas'} no Corre` : '';
    }
    /* quantos tem em cada ramo, na lista dos ramos (a página da cidade e o "Mais em" das outras) */
    {
      document.querySelectorAll('[data-conta]').forEach(el => {
        const k = el.dataset.conta, n = d.gente.filter(q => q.categoria === k && q.aqui).length, m = (d.pedidos || []).filter(q => q.categoria === k).length;
        el.textContent = [n ? `${n} no Corre` : '', m ? `${m} ${m === 1 ? 'pedido aberto' : 'pedidos abertos'}` : ''].filter(Boolean).join(' · ');
      });
    }
  }
  if(pode) rpc('corre_seo_vitrine', { p_cidade: S.cidade }).then(pinta).catch(() => {});

  /* o pedido sem conta: as mesmas regras do Mural do app (3 segundos no mínimo, a armadilha de robô, o WhatsApp com DDD) */
  const f = $('sx-f'); if(!f) return;
  const aberto = Date.now(), dig = s => String(s || '').replace(/\D/g, '');
  /* o exemplo tocado vira a linha do pedido */
  f.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-ex]'); if(!b) return; const t = f.elements.titulo; if(t){ t.value = b.dataset.ex; t.focus(); } });
  const v = n => String((f.elements[n] || {}).value || '').trim();
  const aviso = (t, campo) => { const a = $('sx-f-msg'); if(a){ a.textContent = t; a.hidden = !t; } if(campo && f.elements[campo]) f.elements[campo].focus(); };
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if(v('website')) return feito(null);
    const w = dig(v('whats')), cat = S.ramo ? S.ramo.k : v('categoria');
    if(v('titulo').length < 6) return aviso('Diz em uma linha o que você precisa.', 'titulo');
    if(!cat) return aviso('Escolhe o tipo de serviço.', 'categoria');
    if(v('nome').length < 2) return aviso('Coloca teu nome.', 'nome');
    if(w.length < 10 || w.length > 11) return aviso('Coloca o WhatsApp com DDD.', 'whats');
    if(!pode) return aviso('O pedido não saiu agora. Tenta de novo daqui a pouco.');
    const b = f.querySelector('button[type="submit"]'); if(b.disabled) return; b.disabled = true; const bt = b.textContent; b.textContent = 'Fixando…'; aviso('');
    const espera = 3000 - (Date.now() - aberto); if(espera > 0) await new Promise(r => setTimeout(r, espera));
    try{
      const r = await rpc('corre_mural_fixar', { nome: v('nome'), whats: w, categoria: cat, titulo: v('titulo'), descricao: v('descricao'), cidade: S.cidade, uf: S.uf,
        remoto: !!(f.elements.remoto && f.elements.remoto.checked), quando: v('quando') || 'semana', verba: v('verba') });
      try{ const k = 'corre-mural-meus', l = JSON.parse(localStorage.getItem(k) || '[]').filter(x => x && x.chave !== r.chave); l.unshift({ chave: r.chave, codigo: r.codigo, titulo: v('titulo'), t: Date.now() }); localStorage.setItem(k, JSON.stringify(l.slice(0, 12))); }catch(err){}
      marca('pedido');
      feito(r, v('nome'), w, v('titulo'));
    }catch(err){
      const h = String((err && (err.hint || err.message)) || '');
      aviso(/conexao/.test(h) ? 'Muito pedido saindo dessa internet agora. Tenta de novo mais tarde.' : /limite/.test(h) ? 'Esse WhatsApp já tem 3 pedidos abertos. Resolve um antes.'
        : /cheio/.test(h) ? 'O Mural tá lotado agora. Tenta daqui a pouco.' : 'O pedido não saiu agora. Tenta de novo daqui a pouco.');
      b.disabled = false; b.textContent = bt;
    }
  });
  function feito(r, nome, w, titulo){
    const box = $('sx-f-w'); if(!box) return;
    if(!r || !r.chave){ box.innerHTML = '<h2>Pedido fixado.</h2><p>As propostas chegam pelo link que você recebeu.</p>'; return; }
    const ld = `${location.origin}/#/mural/k/${encodeURIComponent(r.chave)}`, msg = `Meu pedido no Mural do Corre: "${titulo}". Pra ver e escolher as propostas: ${ld}`;
    box.innerHTML = `<h2>Pronto, ${R.esc(String(nome).split(' ')[0])}. Teu pedido tá no Mural.</h2>
      <p>Quem faz isso no Corre já pode mandar proposta. Você vê cada uma com o trabalho de quem mandou e escolhe com quem falar; teu WhatsApp só vai pra quem você escolher.</p>
      <p class="sx-guarda"><b>Guarda este link:</b> é por ele que você vê as propostas.<code>${R.esc(ld.replace(/^https?:\/\//, ''))}</code></p>
      <div class="sx-acts"><a class="sx-bt pri" href="${R.esc(ld)}">Ver as propostas</a><a class="sx-bt" href="https://wa.me/55${R.esc(w)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Mandar o link pro meu WhatsApp</a></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const h = box.querySelector('h2'); if(h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
})();
