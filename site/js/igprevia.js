/* CORRE · A PRÉVIA DO POST NO INSTAGRAM (v5.09)
   O Thales: "quando suba um arquivo pra ser postado no instagram, logo que terminar a plataforma deve mostrar uma prévia
   do post do instagram pra pessoa, e essa mesma demonstração é a que vai pra ser aprovada; entre ser aprovada ela passa
   pelo retorno/atenção, que é quando precisa de alteração, e na demo aparece a opção da pessoa selecionar o que precisa
   ser mudado". Um desenho só, nos três lugares: o Studio Cria (logo depois de salvar o post), a página do cliente (o
   link de aprovação) e o painel do post. Feed e carrossel no jeito do feed do Instagram (o cabeçalho com o @, a mídia
   4:5, os ícones, a legenda e o dia); story e reels em pé (9:16). As cores são as do Instagram claro e ficam fixas: a
   prévia é o Instagram, não o Corre (no Studio de noite ela segue clara, como o celular de quem vai ver).
   O "o que mudar" são itens (a arte, o texto, a legenda, o slide 2...) que o cliente marca tocando na própria prévia
   ou na lista embaixo; vão pro banco junto com o recado (corre_posts.aprov_itens, delta-v509) */
(function(){
  'use strict';
  const C = window.Corre, { esc } = C;

  /* os itens que dá pra pedir pra mudar: a chave vai pro banco, o nome aparece pro cliente e no Studio */
  const NOME = { arte: 'a arte', texto: 'o texto da arte', legenda: 'a legenda', hashtags: 'as hashtags', capa: 'a capa', video: 'o vídeo', data: 'o dia ou o horário', ordem: 'a ordem dos slides', cores: 'as cores', logo: 'o logo', outro: 'outra coisa' };
  const ITEM_OK = k => /^slide:([1-9]|1[0-9]|20)$/.test(k) || Object.prototype.hasOwnProperty.call(NOME, k);
  const nomeItem = k => /^slide:\d+$/.test(k) ? `o slide ${k.slice(6)}` : NOME[k] || '';
  const itensTxt = L => { const n = (L || []).filter(ITEM_OK).map(nomeItem); return n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1]; };
  const midias = p => (Array.isArray(p.midias) && p.midias.length && (p.formato || 'feed') !== 'feed') ? p.midias.filter(m => m && m.u) : ((p.midia || p.midia_url) ? [{ u: p.midia || p.midia_url, t: 'img' }] : []);
  /* o que o cliente pode marcar em cada formato (na ordem que aparece na lista) */
  function itensDe(p){
    const f = p.formato || 'feed', M = midias(p), vid = !!(M[0] && M[0].t === 'video');
    const fim = [['data', 'O dia ou horário'], ['outro', 'Outra coisa']];
    if(f === 'carrossel') return M.map((m, i) => ['slide:' + (i + 1), `Slide ${i + 1}`]).concat([['ordem', 'A ordem dos slides'], ['legenda', 'A legenda'], ['hashtags', 'As hashtags']], fim);
    if(f === 'reels') return [['video', 'O vídeo'], ['capa', 'A capa'], ['legenda', 'A legenda'], ['hashtags', 'As hashtags']].concat(fim);
    if(f === 'story') return [vid ? ['video', 'O vídeo'] : ['arte', 'A arte'], ['texto', 'O texto'], ['logo', 'O logo']].concat(fim);
    return [['arte', 'A arte'], ['texto', 'O texto da arte'], ['cores', 'As cores'], ['legenda', 'A legenda'], ['hashtags', 'As hashtags']].concat(fim);
  }

  /* os ícones do Instagram (traço, do jeito deles; desenho nosso) */
  const SV = (d, t) => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"${t ? ` class="${t}"` : ''}>${d}</svg>`;
  const IC = {
    heart: SV('<path d="M12 20.3 4.6 13a4.7 4.7 0 0 1 0-6.7 4.6 4.6 0 0 1 6.6 0l.8.8.8-.8a4.6 4.6 0 0 1 6.6 0 4.7 4.7 0 0 1 0 6.7Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
    com: SV('<path d="M20.4 15.6A8.6 8.6 0 1 0 17 19.1L21 20Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
    send: SV('<path d="M21.5 3 3 10.1l7.2 3.1M21.5 3l-7.4 18-3.9-7.8M21.5 3 10.2 13.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
    save: SV('<path d="M19 21 12 15.7 5 21V3.5h14Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
    dots: SV('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', 'igp-dots-i'),
    play: SV('<path d="M8 5v14l11-7Z" fill="currentColor"/>'),
    som: SV('<path d="M9 18V6l11-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z" fill="none" stroke="currentColor" stroke-width="1.8"/>')
  };
  const cor = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#FF4F9A';
  const handle = m => String((m && (m.rede || m.nome)) || 'tua.marca').replace(/^@/, '').trim() || 'tua.marca';
  const avatar = m => m && m.logo ? `<img class="igp-av" src="${esc(m.logo)}" alt="">` : `<span class="igp-av igp-ini" style="--c:${cor(m && m.cor)}" aria-hidden="true">${esc(String((m && m.nome) || '?').slice(0, 1).toUpperCase())}</span>`;
  /* a legenda: #hashtag e @menção no azul do Instagram, quebra de linha como lá */
  const cap = t => esc(t).replace(/(^|\s)([#@][\p{L}\p{N}_.]+)/gu, '$1<span class="igp-tg">$2</span>').replace(/\n/g, '<br>');
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataTxt = p => { if(!p.data) return 'Sem dia ainda'; const [, m, d] = String(p.data).split('-').map(Number); return `${d} de ${MES[m - 1]}${p.hora ? ' · ' + String(p.hora).slice(0, 5) : ''}`; };
  /* uma mídia: foto, ou vídeo parado com o play (toca quando a pessoa toca); a capa vai de poster */
  const umaMidia = (x, poster, alt) => x.t === 'video'
    ? `<video src="${esc(x.u)}"${poster ? ` poster="${esc(poster)}"` : ''} muted playsinline loop preload="metadata" aria-label="${esc(alt || 'Vídeo do post')}"></video><i class="igp-play" aria-hidden="true">${IC.play}</i>`
    : `<img src="${esc(x.u)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">`;

  /* o post inteiro. m = { nome, rede, logo, cor } (a marca). Os pedaços que o cliente pode pedir pra mudar levam
     data-mudar (a mídia de cada slide, a legenda, a capa do reels) */
  function html(p, m){
    const f = p.formato || 'feed', M = midias(p), alt = p.alt || p.titulo || '';
    if(!M.length) return `<article class="igp igp-vazio"><p>Sem arte ainda.</p></article>`;
    if(f === 'story'){
      return `<article class="igp igp-story" aria-label="Prévia do story no Instagram">
        <div class="igp-9" data-mudar="${M[0].t === 'video' ? 'video' : 'arte'}">${umaMidia(M[0], p.midia || p.midia_url, alt)}</div>
        <span class="igp-sbar" aria-hidden="true"><i></i></span>
        <header class="igp-sh">${avatar(m)}<b>${esc(handle(m))}</b><small>agora</small></header>
        <footer class="igp-sf"><span class="igp-msg">Enviar mensagem</span>${IC.heart}${IC.send}</footer>
      </article>`;
    }
    if(f === 'reels'){
      return `<article class="igp igp-reels" aria-label="Prévia do reels no Instagram">
        <div class="igp-9" data-mudar="video">${umaMidia(M[0], p.midia || p.midia_url, alt)}</div>
        <div class="igp-rlado" aria-hidden="true">${IC.heart}<small>Curtir</small>${IC.com}<small>0</small>${IC.send}${IC.dots}</div>
        <div class="igp-rbaixo"><p class="igp-rquem">${avatar(m)}<b>${esc(handle(m))}</b><span class="igp-seguir">Seguir</span></p>
          ${p.legenda ? `<div class="igp-cap curta" data-mudar="legenda">${cap(p.legenda)}</div>` : ''}
          <p class="igp-som">${IC.som}<span>${esc(handle(m))} · Áudio original</span></p></div>
        ${p.midia || p.midia_url ? `<button type="button" class="igp-capa" data-mudar="capa"><img src="${esc(p.midia || p.midia_url)}" alt=""><span>Capa</span></button>` : ''}
      </article>`;
    }
    const car = f === 'carrossel' && M.length > 1;
    return `<article class="igp igp-feed" aria-label="Prévia do post no Instagram">
      <header class="igp-h">${avatar(m)}<span class="igp-hq"><b>${esc(handle(m))}</b>${m && m.local ? `<small>${esc(m.local)}</small>` : ''}</span>${IC.dots}</header>
      <div class="igp-mid">
        <div class="igp-trilho"${car ? ` tabindex="0" aria-label="Carrossel com ${M.length} slides: desliza pro lado"` : ''}>${M.map((x, i) => `<div class="igp-sl" data-mudar="${f === 'carrossel' ? 'slide:' + (i + 1) : 'arte'}">${umaMidia(x, i === 0 && x.t === 'video' ? (p.midia || p.midia_url) : '', i === 0 ? alt : `Slide ${i + 1}`)}</div>`).join('')}</div>
        ${car ? `<span class="igp-n" aria-hidden="true">1/${M.length}</span>` : ''}
      </div>
      <div class="igp-acts"><span class="igp-a3">${IC.heart}${IC.com}${IC.send}</span>${car ? `<span class="igp-pts" aria-hidden="true">${M.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>` : '<span></span>'}${IC.save}</div>
      ${p.legenda ? `<div class="igp-cap" data-mudar="legenda"><b>${esc(handle(m))}</b> ${cap(p.legenda)}</div>` : '<p class="igp-semleg">Sem legenda.</p>'}
      <p class="igp-dt">${esc(dataTxt(p))}</p>
    </article>`;
  }
  /* o carrossel: os pontinhos e o 1/N acompanham o slide que tá na tela */
  document.addEventListener('scroll', e => {
    const t = e.target; if(!t || !t.classList || !t.classList.contains('igp-trilho')) return;
    const a = t.closest('.igp'), w = t.clientWidth || 1, i = Math.round(t.scrollLeft / w), n = t.children.length;
    const nn = a && a.querySelector('.igp-n'); if(nn) nn.textContent = `${Math.min(n, i + 1)}/${n}`;
    if(a) a.querySelectorAll('.igp-pts i').forEach((x, k) => x.classList.toggle('on', k === i));
  }, true);
  /* tocar no vídeo toca e para (fora do modo de escolher o que mudar) */
  document.addEventListener('click', e => {
    const v = e.target.closest && e.target.closest('.igp video, .igp .igp-play'); if(!v) return;
    const a = v.closest('.igp'); if(a && a.classList.contains('igp-escolhe')) return;
    const vid = v.tagName === 'VIDEO' ? v : v.parentElement.querySelector('video'); if(!vid) return;
    if(vid.paused){ vid.play().catch(() => {}); vid.parentElement.classList.add('tocando'); } else { vid.pause(); vid.parentElement.classList.remove('tocando'); }
  });

  /* a folha da prévia, no Studio Cria: logo depois de salvar o post, e no painel do post ("Prévia no Instagram") */
  function folha(p, m, o){
    o = o || {};
    const its = Array.isArray(p.aprov_itens) ? p.aprov_itens : [];
    const est = p.aprov === 'aprovado' ? `<p class="apr-nota ok"><b>Aprovado</b>${p.aprov_quem ? ` por ${esc(p.aprov_quem)}` : ''}.</p>`
      : p.aprov === 'ajuste' ? `<p class="apr-nota"><b>Atenção: ${esc(p.aprov_quem || 'o cliente')} pediu pra mudar${its.length ? ' ' + esc(itensTxt(its)) : ''}.</b>${p.aprov_nota ? ` ${esc(p.aprov_nota)}` : ''}</p>` : '';
    C.sheet(`<div class="form igp-folha"><div class="sheet-head"><h2>${o.titulo ? esc(o.titulo) : 'Assim fica no Instagram'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${C.ico('x')}</button></div>
      ${est}
      <div class="igp-palco">${html(p, m)}</div>
      <p class="note">É essa mesma prévia que o cliente vê no link de aprovação: lá ele aprova, ou marca o que precisa mudar.</p>
      <div class="acts">${o.marcaId ? `<button type="button" class="btn pri" data-act="ap-link" data-marca="${esc(o.marcaId)}">${C.ico('link')} Mandar pro cliente aprovar</button>` : ''}${o.editar ? `<button type="button" class="btn" data-act="es-abrir" data-id="${esc(p.id)}">${C.ico('edit')} Editar</button>` : ''}<button type="button" class="btn ghost" data-close>Fechar</button></div>
    </div>`, 'igp-sh');
  }

  C.igPrevia = { html, folha, itensDe, itensTxt, nomeItem, ITEM_OK, midias };
})();
