/* CORRE · LINK NA BIO (v4.0)
   O Thales escolheu a 4.0 com três frentes; esta é a primeira: cada perfil ganha a página pra pôr na bio do Instagram,
   do TikTok e do WhatsApp. app.corresocial.com/@nome (o _redirects do Netlify manda pro index, e o começo do index.html
   troca o endereço por #/bio/nome antes de carregar qualquer coisa). Abre sem login.
   O que mora onde: a configuração é o corre_perfis.bio_link (jsonb, que o banco limpa: delta-v400.sql); a marca do Studio
   Houzi vai congelada nele (cores, letras e o logo numa imagem do Storage), pra página não precisar abrir o Studio; os
   números são contagens por dia e por botão (corre_bio_conta), sem nada de quem visitou.
   Cada bio é também um convite: o pé da página leva pro Corre com ?de=nome (quem entrar por ali e criar o perfil ganha
   correal, e quem chamou também). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C, api = C.api, st = C.st;

  /* os botões, na ordem de fábrica. Quem não tem o dado (sem WhatsApp, vitrine vazia...) some sozinho */
  const BLOCOS = [
    ['orc', 'Pedir orçamento', 'recibo'], ['w', 'WhatsApp', 'wa'], ['vit', 'O que vende (a vitrine)', 'cartao'],
    ['links', 'Teus links', 'link'], ['ig', 'Instagram', 'ig'], ['pix', 'Pix', 'grana'], ['pf', 'Marcas que você toca', 'marcas'],
    ['bb', 'O brandbook da marca', 'houzi'], ['perfil', 'Teu perfil no Corre', 'eu']
  ];
  const NOME_BLOCO = Object.fromEntries(BLOCOS.map(b => [b[0], b[1]]));
  /* as caras prontas (a da marca vem do Studio Houzi). Nenhuma é verde: só a marca que a pessoa fez pode ser */
  const TEMAS = [['corre', 'Corre', 'O preto da noite com o amarelo e o rosa da casa'], ['papel', 'Papel', 'Editorial: papel claro, letra de jornal'],
    ['noite', 'Noite', 'Lilás e roxo, letra gorda'], ['rua', 'Rua', 'Lambe-lambe: concreto, fita e adesivo']];
  const MAX_LINKS = 12;
  const URL_OK = /^(https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+|tel:[0-9+() -]+)$/i;
  const HEX = /^#[0-9A-Fa-f]{6}$/, FONTE = /^[a-z0-9-]{2,30}$/;
  const LOGO_OK = u => typeof u === 'string' && (/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[A-Za-z0-9/_.-]+$/.test(u) || (C.DEMO && /^(data:image\/(png|jpeg);base64,|blob:)/.test(u)));

  /* o link que a pessoa cola (app.corresocial.com/@nome) e a rota de dentro do app */
  const linkDe = h => `${location.origin}/@${h}`;
  const curto = h => `${location.host}/@${h}`;

  /* a configuração lida do banco, do jeito que a página usa (o banco já limpou; aqui limpa de novo, que é barato) */
  function norma(b){
    b = b && typeof b === 'object' ? b : {};
    const vistos = new Set(), blocos = [];
    (Array.isArray(b.blocos) ? b.blocos : []).forEach(x => { const k = x && x.k; if(NOME_BLOCO[k] && !vistos.has(k)){ vistos.add(k); blocos.push({ k, on: x.on !== false }); } });
    BLOCOS.forEach(([k]) => { if(!vistos.has(k)) blocos.push({ k, on: true }); });
    const links = (Array.isArray(b.links) ? b.links : []).filter(l => l && URL_OK.test(String(l.u || '')) && String(l.t || '').trim()).slice(0, MAX_LINKS)
      .map(l => ({ t: String(l.t).trim().slice(0, 60), u: String(l.u).trim().slice(0, 400) }));
    const mv = b.mv && typeof b.mv === 'object' ? b.mv : {};
    return {
      on: b.on !== false, tema: TEMAS.some(t => t[0] === b.tema) || b.tema === 'marca' ? b.tema : 'corre', marca: typeof b.marca === 'string' ? b.marca : '',
      frase: String(b.frase || '').slice(0, 140), blocos, links,
      pix: b.pix && typeof b.pix === 'object' ? { chave: String(b.pix.chave || '').slice(0, 120), nome: String(b.pix.nome || '').slice(0, 60) } : { chave: '', nome: '' },
      mv: { fundo: HEX.test(mv.fundo) ? mv.fundo : '', texto: HEX.test(mv.texto) ? mv.texto : '', cor: HEX.test(mv.cor) ? mv.cor : '', acento: HEX.test(mv.acento) ? mv.acento : '',
        fd: FONTE.test(mv.fd || '') ? mv.fd : '', ft: FONTE.test(mv.ft || '') ? mv.ft : '', logo: LOGO_OK(mv.logo) ? mv.logo : '', nome: String(mv.nome || '').slice(0, 40), slug: /^[a-z0-9-]{1,80}$/.test(mv.slug || '') ? mv.slug : '' }
    };
  }

  /* ---------- cor da marca: o botão tem que aparecer no fundo e a letra tem que ler no botão ---------- */
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  function varsMarca(mv){
    const fundo = mv.fundo || '#FFFFFF', texto = mv.texto && contraste(mv.texto, fundo) >= 4.5 ? mv.texto : (contraste('#141216', fundo) >= contraste('#FFFFFF', fundo) ? '#141216' : '#FFFFFF');
    const cor = mv.cor && contraste(mv.cor, fundo) >= 1.6 ? mv.cor : texto;
    const btx = [fundo, texto, '#141216', '#FFFFFF'].sort((a, b) => contraste(b, cor) - contraste(a, cor))[0];
    const ac = mv.acento && contraste(mv.acento, fundo) >= 1.6 ? mv.acento : cor;
    const fam = (id, rs) => id ? `'lab-${id}',${rs}` : rs;
    return `--b-bg:${fundo};--b-tx:${texto};--b-tx2:${texto}B3;--b-bt:${cor};--b-btx:${btx};--b-ac:${ac};--b-ln:${texto}33;--b-fd:${fam(mv.fd, 'var(--font-display)')};--b-ft:${fam(mv.ft, 'var(--font-body)')}`;
  }
  /* as letras do Studio Houzi (lab/fontes): o mesmo nome de família que o Studio usa, então não briga com ele */
  function fontes(mv){
    [mv.fd, mv.ft].filter(id => id && FONTE.test(id)).forEach(id => {
      if(document.getElementById('bio-f-' + id)) return;
      const s = document.createElement('style'); s.id = 'bio-f-' + id;
      const ttf = /^(lora|poppins|pixel)/.test(id);
      s.textContent = `@font-face{font-family:'lab-${id}';src:url('lab/fontes/${id}${ttf ? '.ttf' : '.otf'}') format('${ttf ? 'truetype' : 'opentype'}');font-display:swap}`;
      document.head.appendChild(s);
    });
  }

  /* ---------- o desenho da página (a pública e a prévia do editor usam o mesmo) ---------- */
  const icoLink = u => /wa\.me|whatsapp/i.test(u) ? 'wa' : /instagram\.com/i.test(u) ? 'ig' : /youtu\.?be/i.test(u) ? 'play' : /spotify|soundcloud|deezer|music\.apple|bandcamp/i.test(u) ? 'musica'
    : /tiktok|vimeo/i.test(u) ? 'film' : /maps\.|goo\.gl\/maps|g\.page|maps\.app/i.test(u) ? 'mapa' : /^mailto:/i.test(u) ? 'send' : /^tel:/i.test(u) ? 'cel' : /behance|dribbble|pinterest|flickr/i.test(u) ? 'img' : 'link';
  const fotoOk = u => /^(https:\/\/|data:image\/jpeg;base64,)/.test(u || '');
  function bioHTML(p, cfg, d, o){
    o = o || {}; d = d || {};
    const h = p.handle, orcOn = (p.horus || {}).orcamento === 'on';
    const linkOrc = it => `#/orcamento/${encodeURIComponent(h)}${it ? '?item=' + encodeURIComponent(it) : ''}`;
    const wa = txt => `https://wa.me/55${p.whats_publico}?text=${encodeURIComponent(txt)}`;
    const ola = `Oi, ${C.firstName(p.nome)}! Vi teu link na bio.`;
    const bt = (href, k, i, t, s, ext) => `<a class="bio-bt" href="${esc(href)}" data-bk="${esc(k)}"${ext ? ' target="_blank" rel="noopener nofollow ugc"' : ''}>${ico(i)}<span><b>${esc(t)}</b>${s ? `<small>${esc(s)}</small>` : ''}</span>${ext ? ico('ext', 'bio-ext') : ''}</a>`;
    const itens = d.itens || [], marcas = d.marcas || [], mv = cfg.mv;
    const R = {
      orc: () => orcOn ? bt(linkOrc(''), 'orc', 'recibo', 'Pedir orçamento', 'Conta o que precisa e recebe o preço') : '',
      w: () => p.whats_publico ? bt(wa(ola), 'w', 'wa', 'Chamar no WhatsApp', '', true) : '',
      vit: () => itens.length ? `<section class="bio-vit" aria-label="O que vende"><h2 class="bio-h">O que vende</h2><div class="bio-vit-l">${itens.slice(0, 12).map(it => {
        const quer = orcOn ? linkOrc(it.id) : p.whats_publico ? wa(`${ola} Quero saber de: ${it.nome}`) : '';
        return `<article class="bio-it">${fotoOk(it.foto_url) ? `<img src="${esc(it.foto_url)}" alt="" loading="lazy">` : `<span class="bio-it-sem" aria-hidden="true">${ico(it.tipo === 'produto' ? 'cartao' : 'magia')}</span>`}
          <b>${esc(it.nome)}</b>${it.preco != null ? `<span class="bio-preco num">${C.money(it.preco)}${it.unidade ? ` <small>/ ${esc(it.unidade)}</small>` : ''}</span>` : ''}
          ${quer ? `<a class="bio-quero" href="${esc(quer)}" data-bk="it:${esc(it.id)}"${orcOn ? '' : ' target="_blank" rel="noopener"'}>Quero esse</a>` : ''}</article>`; }).join('')}</div></section>` : '',
      links: () => cfg.links.map((l, i) => bt(l.u, 'l' + i, icoLink(l.u), l.t, '', true)).join(''),
      ig: () => p.instagram ? bt(`https://www.instagram.com/${encodeURIComponent(p.instagram)}/`, 'ig', 'ig', `@${p.instagram} no Instagram`, '', true) : '',
      pix: () => cfg.pix.chave ? `<div class="bio-pix"><span class="bio-pix-t">${ico('grana')}<b>Pix</b></span><code>${esc(cfg.pix.chave)}</code>${cfg.pix.nome ? `<small>${esc(cfg.pix.nome)}</small>` : ''}<button type="button" class="bio-pix-c" data-act="bio-pix" data-bk="pix" data-chave="${esc(cfg.pix.chave)}">${ico('copy')} Copiar</button></div>` : '',
      pf: () => marcas.length ? `<section class="bio-pf" aria-label="Marcas que toca"><h2 class="bio-h">Marcas que eu toco</h2><div class="bio-pf-l">${marcas.slice(0, 12).map(m => `<span class="bio-pf-i">${C.marcaLogo ? C.marcaLogo(m) : ''}<small>${esc(m.marca)}</small></span>`).join('')}</div></section>` : '',
      bb: () => cfg.tema === 'marca' && mv.slug ? bt(`#/bb/${mv.slug}`, 'bb', 'houzi', mv.nome ? `A marca ${mv.nome}` : 'A marca', 'O brandbook feito no Studio Houzi') : '',
      perfil: () => bt(`#/@${h}`, 'perfil', 'eu', 'Meu perfil no Corre', 'Posts, portfólio e recomendações')
    };
    const corpo = cfg.blocos.filter(b => b.on).map(b => R[b.k] ? R[b.k]() : '').join('');
    const marcaTema = cfg.tema === 'marca' && mv.fundo;
    const topo = marcaTema && mv.logo ? `<img class="bio-logo" src="${esc(mv.logo)}" alt="${esc(mv.nome || p.nome)}">` : `<span class="bio-av">${C.avatar(p, 'l')}</span>`;
    const catN = C.meuCorre ? C.meuCorre.catNome(p.categoria) : '';
    const frase = cfg.frase || p.faz || '';
    return `<main class="bio${o.prev ? ' prev' : ''}" data-tema="${marcaTema ? 'marca' : cfg.tema === 'marca' ? 'corre' : cfg.tema}" data-h="${esc(h)}"${marcaTema ? ` style="${esc(varsMarca(mv))}"` : ''}>
      <div class="bio-col">
        <div class="bio-acima">${o.prev ? '' : `<a class="bio-corre" href="#/" aria-label="Corre">Corre</a>`}<button type="button" class="bio-share" data-act="bio-share" data-h="${esc(h)}" data-n="${esc(p.nome)}" aria-label="Mandar este link">${ico('share')}</button></div>
        <header class="bio-topo">${topo}
          <h1 class="bio-nome">${esc(p.nome)}</h1>
          <p class="bio-at">@${esc(h)}${p.cidade ? ` · ${esc(p.cidade)}` : ''}</p>
          ${frase ? `<p class="bio-frase">${esc(frase)}</p>` : ''}
          ${p.aberto || (catN && p.categoria !== 'outros') ? `<p class="bio-tags">${p.aberto ? '<span class="bio-tag on">Aberto pra trampo</span>' : ''}${catN && p.categoria !== 'outros' ? `<span class="bio-tag">${esc(catN)}</span>` : ''}</p>` : ''}
        </header>
        <nav class="bio-bts" aria-label="Links de @${esc(h)}">${corpo || `<p class="bio-vazio">${o.prev ? 'Liga algum botão do lado (ou embaixo) pra ele aparecer aqui.' : 'Em breve, mais coisa por aqui.'}</p>`}</nav>
        <footer class="bio-pe"><a href="/?de=${encodeURIComponent(h)}" data-bk="corre"><span class="bio-pe-1">Feito no <b>Corre</b></span><span class="bio-pe-2">Faz o teu link na bio de graça</span></a></footer>
      </div>
    </main>`;
  }

  /* o que a página lê além do perfil: a vitrine (aberta, é de venda) e o portfólio (o banco esconde de quem não pode ver) */
  async function dadosDe(p, cfg){
    const on = k => cfg.blocos.some(b => b.k === k && b.on);
    const [vit, marcas] = await Promise.all([
      on('vit') ? api.rpc('corre_vitrine', { p: p.id }).catch(() => null) : null,
      on('pf') ? api.q('corre_portfolio', { eq: { dono: p.id }, order: ['ordem', true] }).catch(() => []) : []
    ]);
    return { itens: (vit && vit.itens) || [], marcas: (marcas || []).filter(m => m.publico !== false) };
  }

  /* ---------- os números: a visita uma vez por sessão, e cada toque. A do dono o banco nem conta ---------- */
  const conta = (h, k) => { if(!h || !/^[a-z0-9:_-]{1,48}$/.test(k)) return; try{ const r = api.rpc('corre_bio_marca', { p_handle: h, p_chave: k }); if(r && r.catch) r.catch(() => {}); }catch(e){} };
  function visita(h){
    const key = 'corre-bio-v:' + h;
    try{ if(sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); }catch(e){}
    conta(h, 'visita');
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.bio [data-bk]'); if(!a) return;
    const b = a.closest('.bio');
    if(b.classList.contains('prev')){ if(a.tagName === 'A'){ e.preventDefault(); toast('É a prévia: na página de verdade, esse botão abre.'); } return; }
    conta(b.dataset.h, a.dataset.bk);
  }, true);

  /* ---------- a página pública (#/bio/nome) ---------- */
  C.views.bio = async (app, h) => {
    h = String(h || '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
    document.body.classList.remove('com-lado'); document.body.classList.add('em-bio');
    document.title = `@${h} · Corre`;
    app.innerHTML = `<main class="bio" data-tema="corre"><div class="bio-col"><p class="bio-esp">Abrindo @${esc(h)}…</p></div></main>`;
    const rota = C.rota;
    let p = null; try{ p = h ? await api.one('corre_perfis', { eq: { handle: h } }) : null; }catch(e){ p = null; }
    if(rota !== C.rota) return;
    if(!p){
      app.innerHTML = `<main class="bio" data-tema="corre"><div class="bio-col"><header class="bio-topo"><h1 class="bio-nome">Esse link não existe.</h1><p class="bio-frase">Ninguém no Corre usa o @${esc(h)}. Pode ser o teu.</p></header>
        <nav class="bio-bts"><a class="bio-bt" href="/">${ico('raio')}<span><b>Faz o teu link na bio no Corre</b><small>De graça, com vitrine, orçamento e WhatsApp</small></span></a></nav></div></main>`;
      return;
    }
    const cfg = norma(p.bio_link);
    /* desligado: o link abre o perfil do Corre */
    if(!cfg.on){ try{ history.replaceState(null, '', location.pathname + location.search + '#/@' + h); }catch(e){} return C.refresh(); }
    const d = await dadosDe(p, cfg);
    if(rota !== C.rota) return;
    document.title = `${p.nome} (@${h}) · Corre`;
    if(cfg.tema === 'marca') fontes(cfg.mv);
    app.innerHTML = bioHTML(p, cfg, d);
    visita(h);
  };

  Object.assign(C.acts, {
    'bio-pix': el => C.copy(el.dataset.chave || '', 'Chave Pix copiada.'),
    'bio-share': async el => {
      const h = el.dataset.h || (st.me && st.me.handle), url = linkDe(h);
      if(navigator.share){ try{ await navigator.share({ title: `${el.dataset.n || '@' + h} no Corre`, url }); const b = el.closest('.bio'); if(b && !b.classList.contains('prev')) conta(h, 'share'); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
      C.copy(url, 'Link copiado. Cola na bio.');
    }
  });

  /* ---------- o editor (#/linkbio) ---------- */
  const E = { cfg: null, d: null, marcas: [], prevUrl: '', logoDe: '', sujo: false };
  const novoLink = () => ({ t: '', u: '' });
  function temDado(k){
    const p = st.me || {}, d = E.d || {};
    return k === 'orc' ? (p.horus || {}).orcamento === 'on' : k === 'w' ? !!p.whats_publico : k === 'vit' ? !!(d.itens || []).length : k === 'links' ? E.cfg.links.some(l => URL_OK.test(l.u) && l.t.trim())
      : k === 'ig' ? !!p.instagram : k === 'pix' ? !!E.cfg.pix.chave : k === 'pf' ? !!(d.marcas || []).length : k === 'bb' ? E.cfg.tema === 'marca' && !!E.cfg.mv.slug : true;
  }
  const FALTA = { orc: ['Liga o "Pedido de orçamento" em Editar perfil.', '#/editar'], w: ['Põe teu WhatsApp em Editar perfil.', '#/editar'], vit: ['Marca "Mostrar no meu perfil" no catálogo.', '#/marcas'],
    links: ['Põe um link embaixo, em Teus links.', ''], ig: ['Põe teu @ do Instagram em Editar perfil.', '#/editar'], pix: ['Põe a chave embaixo, em Pix.', ''], pf: ['Põe as marcas que você toca no Portfólio.', '#/marcas'],
    bb: ['Só com a cara de uma marca do Studio Houzi publicada.', ''] };

  C.views.linkbio = async app => {
    const me = st.me; if(!me) return;
    document.title = 'Link na bio · Corre';
    app.innerHTML = C.header('linkbio') + `<main class="wrap lb"><section class="card"><p>Abrindo o teu link na bio…</p></section></main>`;
    const rota = C.rota;
    E.cfg = norma(me.bio_link); E.sujo = false; E.prevUrl = ''; E.logoDe = E.cfg.mv.logo ? E.cfg.marca : '';
    const [d, marcas, nums] = await Promise.all([
      dadosDe(me, Object.assign({}, E.cfg, { blocos: BLOCOS.map(b => ({ k: b[0], on: true })) })),
      api.q('corre_houzi_marcas', { eq: { dono: me.id }, order: ['updated_at', false], limit: 40 }).catch(() => []),
      api.rpc('corre_bio_numeros', { p_dias: 30 }).catch(() => null)
    ]);
    if(rota !== C.rota) return;
    E.d = d; E.marcas = (marcas || []).filter(m => m && m.spec && m.spec.cores && m.spec.tipo);
    const h = me.handle;
    app.innerHTML = C.header('linkbio') + `<main class="wrap lb">
      <div class="lb-cols">
        <div class="lb-form">
          <section class="card lb-link">
            <span class="mono">${ico('link')} Link na bio</span>
            <h1 class="ch">Um link pra tudo que você faz</h1>
            <p class="note">Cola na bio do Instagram, do TikTok e do WhatsApp. Quem toca vê o que você faz, o que vende e como te chamar.</p>
            <div class="lb-url"><code>${esc(curto(h))}</code><button type="button" class="btn sm pri" data-act="lb-copia">${ico('copy')} Copiar</button></div>
            <div class="acts"><a class="btn sm" href="#/bio/${esc(h)}">${ico('ext')} Abrir a página</a><button type="button" class="btn sm" data-act="lb-qr" aria-haspopup="dialog">${ico('qr')} QR code</button><button type="button" class="btn sm" data-act="bio-share" data-h="${esc(h)}" data-n="${esc(me.nome)}">${ico('share')} Mandar</button></div>
            <label class="switch lb-on"><input type="checkbox" id="lb-on"${E.cfg.on ? ' checked' : ''}><span class="sw"></span><span><b>No ar</b><small>Desligado, o link abre teu perfil do Corre.</small></span></label>
          </section>
          <section class="card"><h2 class="ch">A cara</h2><div class="lb-temas" role="radiogroup" aria-label="A cara da página" id="lb-temas"></div><p class="fine" id="lb-marca-n"></p></section>
          <section class="card"><h2 class="ch"><label for="lb-frase">A frase de cima</label></h2><input class="inp" id="lb-frase" maxlength="140" value="${esc(E.cfg.frase)}" placeholder="${esc(me.faz || 'O que você faz, numa frase')}"><p class="fine">Vazia, vai o que você vende (do Editar perfil).</p></section>
          <section class="card"><h2 class="ch">Os botões</h2><p class="fine">Liga, desliga e muda a ordem. O que tá apagado ainda não tem o que mostrar.</p><ol class="lb-blocos" id="lb-blocos"></ol></section>
          <section class="card"><h2 class="ch">Teus links</h2><p class="fine">Portfólio, loja, música, agenda, o que quiser (até ${MAX_LINKS}).</p><div id="lb-links"></div><button type="button" class="btn sm" data-act="lb-link-mais">${ico('plus')} Link</button></section>
          <section class="card"><h2 class="ch">Pix</h2><div class="row2"><div class="fld"><label for="lb-pix">Chave</label><input class="inp" id="lb-pix" maxlength="120" value="${esc(E.cfg.pix.chave)}" placeholder="CPF, CNPJ, e-mail, celular ou aleatória"></div>
            <div class="fld"><label for="lb-pix-n">Nome de quem recebe</label><input class="inp" id="lb-pix-n" maxlength="60" value="${esc(E.cfg.pix.nome)}" placeholder="${esc(me.nome)}"></div></div><p class="fine">A chave aparece pra qualquer um que abrir a página, com o botão de copiar.</p></section>
          <section class="card lb-nums" id="lb-nums" aria-label="Quem passou"></section>
          <div class="lb-salva"><button type="button" class="btn pri" id="lb-salvar" data-act="lb-salva">${ico('check')} Salvar</button><span class="fine" id="lb-st" role="status"></span></div>
        </div>
        <aside class="lb-prev" aria-label="Como fica"><p class="mono">Como fica</p><div class="lb-tel"><div class="lb-tela" id="lb-tela"></div></div></aside>
      </div>
    </main>`;
    pintaTemas(); pintaBlocos(); pintaLinks(); pintaNums(nums); previa();
    const on = $('lb-on'), frase = $('lb-frase'), pix = $('lb-pix'), pixN = $('lb-pix-n');
    on.addEventListener('change', () => { E.cfg.on = on.checked; suja(); });
    frase.addEventListener('input', () => { E.cfg.frase = frase.value; suja(); prevLogo(); });
    pix.addEventListener('input', () => { E.cfg.pix.chave = pix.value.trim(); suja(); pintaBlocos(); prevLogo(); });
    pixN.addEventListener('input', () => { E.cfg.pix.nome = pixN.value.trim(); suja(); prevLogo(); });
    if(E.cfg.tema === 'marca' && E.cfg.marca && !E.cfg.mv.logo) acharMarca(E.cfg.marca);
  };
  const suja = () => { E.sujo = true; const s = $('lb-st'); if(s) s.textContent = 'Tem mudança sem salvar.'; };
  let prevT = 0;
  const prevLogo = () => { clearTimeout(prevT); prevT = setTimeout(previa, 160); };
  function previa(){
    const t = $('lb-tela'); if(!t || !st.me) return;
    const cfg = Object.assign({}, E.cfg, { links: E.cfg.links.filter(l => URL_OK.test(l.u) && l.t.trim()), mv: Object.assign({}, E.cfg.mv, E.prevUrl ? { logo: E.prevUrl } : {}) });
    if(cfg.tema === 'marca') fontes(cfg.mv);
    t.innerHTML = bioHTML(st.me, cfg, E.d, { prev: true });
  }
  function pintaTemas(){
    const el = $('lb-temas'); if(!el) return;
    const chip = (v, n, s, ex) => `<button type="button" class="lb-tema" role="radio" aria-checked="${ex}" data-act="lb-tema" data-k="${esc(v)}">${n}${s ? `<small>${esc(s)}</small>` : ''}</button>`;
    el.innerHTML = TEMAS.map(([k, n, s]) => chip(k, `<i class="lb-amostra" data-tema="${k}" aria-hidden="true"></i><b>${esc(n)}</b>`, s, E.cfg.tema === k)).join('')
      + E.marcas.map(m => { const c = m.spec.cores; return chip('m:' + m.id, `<i class="lb-amostra" aria-hidden="true" style="background:${HEX.test(c.paper) ? c.paper : '#fff'};border-color:${HEX.test(c.p) ? c.p : '#000'};box-shadow:inset 0 -10px 0 ${HEX.test(c.p) ? c.p : '#000'}"></i><b>${esc(m.nome || m.spec.nome || 'Marca')}</b>`, 'Marca do Studio Houzi', E.cfg.tema === 'marca' && E.cfg.marca === m.id); }).join('')
      + (E.marcas.length ? '' : `<a class="lb-tema lb-tema-nova" href="#/houzi"><i class="lb-amostra" aria-hidden="true">${ico('houzi')}</i><b>Tua marca</b><small>Faz no Studio Houzi e ela veste a página</small></a>`);
    const n = $('lb-marca-n');
    if(n) n.textContent = E.cfg.tema === 'marca' && E.cfg.mv.nome ? `Com a marca ${E.cfg.mv.nome}: as cores, as letras e o logo dela. Mudou a marca no Studio? Escolhe ela aqui de novo e salva.` : '';
  }
  function pintaBlocos(){
    const el = $('lb-blocos'); if(!el) return;
    el.innerHTML = E.cfg.blocos.map((b, i) => {
      const [, n, ic] = BLOCOS.find(x => x[0] === b.k), tem = temDado(b.k), f = FALTA[b.k];
      return `<li class="lb-b${tem ? '' : ' sem'}"><span class="lb-b-i">${ico(ic)}</span><span class="lb-b-t"><b>${esc(n)}</b>${tem || !f ? '' : `<small>${f[1] ? `<a href="${f[1]}">${esc(f[0])}</a>` : esc(f[0])}</small>`}</span>
        <span class="lb-b-a"><button type="button" class="lb-seta" data-act="lb-sobe" data-i="${i}" aria-label="Subir ${esc(n)}"${i ? '' : ' disabled'}>${ico('sobe')}</button><button type="button" class="lb-seta" data-act="lb-desce" data-i="${i}" aria-label="Descer ${esc(n)}"${i < E.cfg.blocos.length - 1 ? '' : ' disabled'}>${ico('desce')}</button>
        <label class="switch sw-so"><input type="checkbox" data-chg="lb-bloco" data-i="${i}"${b.on ? ' checked' : ''} aria-label="Mostrar ${esc(n)}"><span class="sw"></span></label></span></li>`;
    }).join('');
  }
  function pintaLinks(){
    const el = $('lb-links'); if(!el) return;
    if(!E.cfg.links.length) E.cfg.links.push(novoLink());
    el.innerHTML = E.cfg.links.map((l, i) => `<div class="lb-l" data-i="${i}">
      <input class="inp" data-lk="t" data-i="${i}" maxlength="60" value="${esc(l.t)}" placeholder="O nome (ex.: Meu portfólio)" aria-label="Nome do link ${i + 1}">
      <input class="inp" data-lk="u" data-i="${i}" maxlength="400" value="${esc(l.u)}" placeholder="O endereço (ex.: behance.net/voce)" inputmode="url" aria-label="Endereço do link ${i + 1}">
      <span class="lb-l-a"><button type="button" class="lb-seta" data-act="lb-l-sobe" data-i="${i}" aria-label="Subir o link ${i + 1}"${i ? '' : ' disabled'}>${ico('sobe')}</button><button type="button" class="lb-seta" data-act="lb-l-x" data-i="${i}" aria-label="Tirar o link ${i + 1}">${ico('x')}</button></span>
      <small class="lb-l-e" id="lb-l-e${i}" role="status"></small></div>`).join('');
    el.querySelectorAll('input[data-lk]').forEach(inp => inp.addEventListener('input', () => {
      const l = E.cfg.links[+inp.dataset.i]; if(!l) return;
      l[inp.dataset.lk] = inp.value; suja(); prevLogo();
      const e = $('lb-l-e' + inp.dataset.i); if(e) e.textContent = l.u && !URL_OK.test(arruma(l.u)) ? 'Esse endereço não abre. Confere.' : '';
    }));
    el.querySelectorAll('input[data-lk="u"]').forEach(inp => inp.addEventListener('blur', () => { const l = E.cfg.links[+inp.dataset.i]; if(l && l.u){ l.u = arruma(l.u); inp.value = l.u; prevLogo(); pintaBlocos(); } }));
  }
  /* "behance.net/voce" vira "https://behance.net/voce"; e-mail vira mailto; @ do Instagram vira o link dele */
  const arruma = u => {
    u = String(u || '').trim();
    if(!u || URL_OK.test(u)) return u;
    if(/^@[A-Za-z0-9_.]{1,30}$/.test(u)) return `https://www.instagram.com/${u.slice(1)}/`;
    if(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(u)) return 'mailto:' + u;
    if(/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(u)) return 'https://' + u;
    return u;
  };
  function pintaNums(n){
    const el = $('lb-nums'); if(!el) return;
    if(!n){ el.innerHTML = `<h2 class="ch">Quem passou</h2><p class="fine">Os números aparecem aqui depois que o Corre for atualizado (falta rodar o delta da 4.0 no banco).</p>`; return; }
    const dias = n.porDia || [], max = Math.max(1, ...dias.map(x => +x.n || 0)), hoje = Date.now();
    const barras = Array.from({ length: 30 }, (_, i) => { const dia = new Date(hoje - (29 - i) * 864e5 - 3 * 3600e3).toISOString().slice(0, 10), x = dias.find(y => String(y.dia).slice(0, 10) === dia); const v = x ? +x.n : 0; return `<i style="height:${Math.round(4 + 56 * v / max)}px" title="${C.ddmm ? C.ddmm(dia) : dia}: ${v}"></i>`; }).join('');
    const nome = k => k.startsWith('l') && /^l\d+$/.test(k) ? `Link: ${(E.cfg.links[+k.slice(1)] || {}).t || 'tirado'}` : k.startsWith('it:') ? `Vitrine: ${((E.d.itens || []).find(i => i.id === k.slice(3)) || {}).nome || 'item'}` : ({ orc: 'Pedir orçamento', w: 'WhatsApp', ig: 'Instagram', pix: 'Copiou o Pix', perfil: 'Perfil no Corre', bb: 'Brandbook', corre: 'Foi fazer o dele no Corre', share: 'Mandou o teu link' })[k] || k;
    const t = Object.entries(n.toques || {}).sort((a, b) => b[1] - a[1]);
    el.innerHTML = `<h2 class="ch">Quem passou <small>(30 dias)</small></h2>
      <p class="lb-n-g"><b class="num">${n.visitas || 0}</b> ${(n.visitas || 0) === 1 ? 'visita' : 'visitas'} <span>· ${t.reduce((s, x) => s + x[1], 0)} toques nos botões</span></p>
      <div class="lb-barras" role="img" aria-label="Visitas por dia nos últimos 30 dias">${barras}</div>
      ${t.length ? `<ul class="lb-toques">${t.slice(0, 10).map(([k, v]) => `<li><span>${esc(nome(k))}</span><b class="num">${v}</b></li>`).join('')}</ul>` : '<p class="fine">Ninguém tocou em nada ainda. Põe o link na bio e manda pra galera.</p>'}
      <p class="fine">Só contagem: o Corre não guarda quem visitou. As tuas visitas não contam.</p>`;
  }

  /* a marca do Studio Houzi: abre o Studio (só aqui, no editor), desenha o logo e congela cor e letra */
  async function acharMarca(id){
    const m = E.marcas.find(x => x.id === id); if(!m) return;
    const n = $('lb-marca-n'); if(n) n.textContent = `Vestindo a página com a marca ${m.nome || ''}…`;
    try{
      await C.houziCarrega();
      const H = C.houzi, M = C.labMotor, sp = m.spec, fs = await H.fs(sp), r = H.svg(sp, fs, { svg: { fundo: false } });
      const vb = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(r.svg), w = vb ? +vb[3] : 1, hh = vb ? +vb[4] : 1;
      const W = w >= hh ? 900 : Math.round(900 * w / hh), Hh = w >= hh ? Math.round(900 * hh / w) : 900;
      const blob = await M.png(r.svg, Math.max(60, W), Math.max(60, Hh), 'image/png');
      if(E.cfg.marca !== id) return;
      E.blob = blob; E.logoDe = '';
      if(E.prevUrl && E.prevUrl.startsWith('blob:')) URL.revokeObjectURL(E.prevUrl);
      E.prevUrl = URL.createObjectURL(blob);
      const v = r.v;
      E.cfg.mv = { fundo: v.fundo, texto: v.texto, cor: v.marca, acento: v.acento || v.marca, fd: sp.tipo.display, ft: sp.tipo.texto, logo: '', nome: String(m.nome || sp.nome || '').slice(0, 40), slug: m.publica && m.slug ? m.slug : '' };
      pintaTemas(); pintaBlocos(); previa();
    }catch(e){ if(n) n.textContent = 'Não deu pra vestir com a marca agora. Tenta de novo.'; }
  }

  Object.assign(C.acts, {
    'lb-copia': () => C.copy(linkDe(st.me.handle), 'Link copiado. Cola na bio.'),
    'lb-tema': el => {
      const k = el.dataset.k;
      if(k.startsWith('m:')){ const id = k.slice(2); if(E.cfg.tema === 'marca' && E.cfg.marca === id) return; E.cfg.tema = 'marca'; E.cfg.marca = id; E.cfg.mv = { fundo: '', texto: '', cor: '', acento: '', fd: '', ft: '', logo: '', nome: '', slug: '' }; E.prevUrl = ''; acharMarca(id); }
      else { E.cfg.tema = k; E.cfg.marca = ''; }
      suja(); pintaTemas(); pintaBlocos(); previa();
    },
    'lb-bloco': el => { const b = E.cfg.blocos[+el.dataset.i]; if(b){ b.on = el.checked; suja(); previa(); } },
    'lb-sobe': el => { const i = +el.dataset.i, L = E.cfg.blocos; if(i > 0){ [L[i - 1], L[i]] = [L[i], L[i - 1]]; suja(); pintaBlocos(); previa(); const b = document.querySelector(`[data-act="lb-sobe"][data-i="${i - 1}"]`); if(b && !b.disabled) b.focus(); } },
    'lb-desce': el => { const i = +el.dataset.i, L = E.cfg.blocos; if(i < L.length - 1){ [L[i + 1], L[i]] = [L[i], L[i + 1]]; suja(); pintaBlocos(); previa(); const b = document.querySelector(`[data-act="lb-desce"][data-i="${i + 1}"]`); if(b && !b.disabled) b.focus(); } },
    'lb-link-mais': () => { if(E.cfg.links.length >= MAX_LINKS) return toast(`Até ${MAX_LINKS} links.`); E.cfg.links.push(novoLink()); pintaLinks(); const l = document.querySelectorAll('#lb-links input[data-lk="t"]'); if(l.length) l[l.length - 1].focus(); },
    'lb-l-sobe': el => { const i = +el.dataset.i, L = E.cfg.links; if(i > 0){ [L[i - 1], L[i]] = [L[i], L[i - 1]]; suja(); pintaLinks(); previa(); } },
    'lb-l-x': el => { E.cfg.links.splice(+el.dataset.i, 1); suja(); pintaLinks(); pintaBlocos(); previa(); },
    'lb-salva': async el => {
      if(el.disabled) return;
      const cfg = E.cfg, ruins = cfg.links.filter(l => (l.u || l.t) && !(URL_OK.test(arruma(l.u)) && l.t.trim()));
      if(ruins.length) return toast('Tem link sem nome ou com endereço que não abre. Arruma ou tira antes de salvar.', 4200);
      el.disabled = true; const s = $('lb-st'); if(s) s.textContent = 'Salvando…';
      try{
        /* o logo da marca sobe uma vez (a imagem fica no Storage do Corre e a página não precisa do Studio) */
        if(cfg.tema === 'marca' && cfg.marca && E.blob && E.logoDe !== cfg.marca){ cfg.mv.logo = await api.upload(E.blob); E.logoDe = cfg.marca; }
        const salvo = { on: cfg.on, tema: cfg.tema, frase: cfg.frase.trim(), blocos: cfg.blocos, links: cfg.links.map(l => ({ t: l.t.trim(), u: arruma(l.u) })).filter(l => l.t && URL_OK.test(l.u)), pix: cfg.pix };
        if(cfg.tema === 'marca' && cfg.marca){ salvo.marca = cfg.marca; salvo.mv = cfg.mv; }
        await C.saveMe({ bio_link: salvo });
        E.cfg = norma(st.me.bio_link || salvo); E.sujo = false;
        pintaLinks(); pintaBlocos(); previa();
        if(s) s.textContent = 'Salvo. Já tá no ar.';
        toast(cfg.on ? 'Link na bio salvo. Já tá no ar.' : 'Salvo. Desligado: o link abre teu perfil.');
      }catch(e){
        const m = String((e && (e.message || e.details)) || '');
        if(s) s.textContent = '';
        toast(/bio_link/.test(m) ? 'O banco ainda não tem o Link na bio: falta rodar o delta da 4.0.' : C.errMsg(e, 'Não deu pra salvar agora.'), 4600);
      }finally{ el.disabled = false; }
    },
    /* o QR do link (o desenho do QR mora no Studio Houzi: desce só agora) */
    'lb-qr': async () => {
      const h = st.me.handle, url = linkDe(h);
      C.sheet(`<div class="sheet-h"><h2>QR do teu link</h2><button type="button" class="x" data-close aria-label="Fechar">${ico('x')}</button></div><div class="lb-qr" id="lb-qr"><p class="fine">Desenhando…</p></div>`, 'lb-qr-sh');
      try{
        await C.houziCarrega();
        const svg = C.labMotor.qrSvg(url, { titulo: `QR de ${curto(h)}` });
        const el = $('lb-qr'); if(!el) return;
        const blob = await C.labMotor.png(svg, 1024, 1024, 'image/png');
        const u = URL.createObjectURL(blob);
        el.innerHTML = `<img src="${u}" alt="QR code que abre ${esc(curto(h))}"><p class="fine">Imprime no balcão, no cartão, na embalagem: a câmera do celular abre a tua página.</p><a class="btn pri" href="${u}" download="link-na-bio-${esc(h)}.png">${ico('down')} Baixar o QR</a>`;
      }catch(e){ const el = $('lb-qr'); if(el) el.innerHTML = '<p class="fine">Não deu pra desenhar o QR agora. Tenta de novo.</p>'; }
    }
  });
  C.bio = { norma, bioHTML, linkDe, curto };
})();
