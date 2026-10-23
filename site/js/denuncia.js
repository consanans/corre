/* CORRE · v4.31 · denunciar
   A Google só aceita rede social na loja com um jeito de denunciar post e gente dentro do app, e de bloquear (o bloquear
   o Corre tem desde a v3.34, nas mensagens e na cidade; agora também no perfil). Aqui:
     C.denuncia.abre({ tipo, id, h, ctx })  a folha: o motivo num toque, um texto se quiser e, pra gente, "bloquear também".
                                            tipo: post, story, perfil ou conversa (na conversa, id é a pessoa e ctx a conversa).
     C.denuncia.perfil(el)                  o "⋯" do perfil de outra pessoa: Denunciar e Bloquear/Desbloquear.
     C.denuncia.lojinha(el)                 as denúncias abertas na Lojinha, pros donos decidirem (tá tudo certo / tirar do ar).
   Quem decide o que vale é o banco (delta-v431.sql): não denuncia a si mesmo, uma vez por coisa, 30 por dia, e quem
   denunciou nunca aparece pra quem foi denunciado. */
(function(){
  const C = window.Corre;
  const { esc, ico } = C;
  const MOTIVOS = [
    ['golpe', 'Golpe ou fraude'], ['assedio', 'Assédio ou ameaça'], ['odio', 'Ódio ou preconceito'],
    ['nudez', 'Nudez ou conteúdo sexual'], ['violencia', 'Violência'], ['menor', 'Coloca criança ou adolescente em risco'],
    ['spam', 'Spam ou propaganda enganosa'], ['falso', 'Perfil falso ou se passando por alguém'], ['outro', 'Outra coisa']
  ];
  const ROTULO = Object.fromEntries(MOTIVOS);
  const OQUE = { post: 'o post', story: 'o story', perfil: 'o perfil', conversa: 'a conversa' };
  const OQUE_T = { post: 'Post', story: 'Story', perfil: 'Perfil', conversa: 'Conversa' };
  let D = null;   // o que tá sendo denunciado agora
  const semFn = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || ''));

  function abre(o){
    if(!C.uid()){ C.toast('Entra no Corre pra denunciar.'); return; }
    D = { tipo: o.tipo, id: o.id, h: o.h || '', ctx: o.ctx || null, motivo: '' };
    const gente = D.tipo === 'perfil' || D.tipo === 'conversa';
    C.sheet(`<div class="form den" role="form" aria-labelledby="den-t"><div class="sheet-head"><h2 id="den-t">${ico('bandeira')} Denunciar ${OQUE[D.tipo]}${D.h ? ` de @${esc(D.h)}` : ''}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="note">Ninguém fica sabendo que foi você. A gente olha e, se for o caso, tira do ar.</p>
      <fieldset class="den-ms"><legend>O que tá acontecendo?</legend>
        ${MOTIVOS.map(([k, t]) => `<button type="button" class="den-m" data-act="den-motivo" data-k="${k}" aria-pressed="false">${esc(t)}</button>`).join('')}
      </fieldset>
      <label class="den-tx"><span>Quer contar mais? <small>(se quiser)</small></span><textarea id="den-texto" class="inp" rows="3" maxlength="500" placeholder="O que a gente precisa saber"></textarea></label>
      ${gente && D.h ? `<label class="den-bl"><input type="checkbox" id="den-bloq"> <span>Bloquear @${esc(D.h)} também <small>(não te manda mensagem nem te vê na cidade)</small></span></label>` : ''}
      <p class="fine den-perigo">Se alguém corre perigo agora, liga 190. Criança ou adolescente em risco: Disque 100.</p>
      <div class="acts"><button type="button" class="btn pri" id="den-manda" data-act="den-manda" disabled>${ico('bandeira')} Mandar a denúncia</button><button type="button" class="btn ghost" data-close>Agora não</button></div></div>`,
      /* o story fica aberto embaixo (a folha vem por cima dele, como a do Insta) */
      D.tipo === 'story' ? 'over-story' : '');
  }

  async function manda(el){
    if(!D || !D.motivo) return;
    const texto = (C.$('den-texto') || {}).value || '';
    const bloq = !!(C.$('den-bloq') || {}).checked;
    el.disabled = true; const ant = el.innerHTML; el.textContent = 'Mandando…';
    try{
      const r = await C.api.rpc('corre_denuncia', { p_tipo: D.tipo, p_alvo: D.id, p_motivo: D.motivo, p_texto: texto.trim().slice(0, 500), p_ctx: D.ctx });
      if(!r || r.ok === false){
        const m = r && r.motivo;
        C.toast(m === 'proprio' ? 'Isso é teu: dá pra apagar em vez de denunciar.' : m === 'devagar' ? 'Muitas denúncias hoje. Amanhã dá de novo.' : m === 'nao' ? 'Isso não tá mais aqui.' : 'Não deu pra mandar agora. Tenta de novo.', 4200);
        el.disabled = false; el.innerHTML = ant; return;
      }
      if(bloq) await bloqueia(D.id, true).catch(() => {});
      C.closeSheet();
      C.toast(r.ja ? 'Você já tinha denunciado isso. A gente tá olhando.' : `Denúncia enviada. Obrigado por cuidar do Corre.${bloq ? ` @${D.h} foi bloqueado.` : ''}`, 4200);
      /* o aviso no celular dos donos (a função push junta com os pedidos) */
      if(C.avisaPedido) C.avisaPedido();
    }catch(e){
      el.disabled = false; el.innerHTML = ant;
      C.toast(semFn(e) ? 'O denunciar liga quando o banco atualizar. Por enquanto, manda pra contato@houzirecords.com.br.' : C.errMsg(e), 5200);
    }
  }

  /* bloquear e desbloquear (o mesmo bloqueio das mensagens e da cidade: corre_verso_bloq) */
  async function bloqueia(quem, on){
    if(on) await C.api.ins('corre_verso_bloq', { quem }).catch(e => { if(!(e && e.code === '23505')) throw e; });
    else await C.api.del('corre_verso_bloq', { dono: C.uid(), quem });
  }
  async function bloqueado(quem){
    try{ const r = await C.api.q('corre_verso_bloq', { eq: { dono: C.uid(), quem } }); return !!(r && r.length); }catch(e){ return false; }
  }

  /* o "⋯" do perfil de outra pessoa */
  async function perfil(el){
    const id = el.dataset.id, h = el.dataset.h || '';
    const ja = await bloqueado(id);
    C.sheet(`<div class="form den-pf"><div class="sheet-head"><h2>@${esc(h)}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <div class="fd-mops"><button type="button" class="btn" data-act="den-abre" data-t="perfil" data-id="${esc(id)}" data-h="${esc(h)}">${ico('bandeira')} Denunciar @${esc(h)}</button>
      <button type="button" class="btn ghost" data-act="den-bloq" data-id="${esc(id)}" data-h="${esc(h)}" data-on="${ja ? 1 : 0}">${ico('lock')} ${ja ? 'Desbloquear' : 'Bloquear'} @${esc(h)}</button></div>
      <p class="fine">Bloquear vale pro Corre todo: a pessoa não te manda mensagem nem te vê na cidade. Ela não fica sabendo.</p></div>`);
  }

  /* ---- na Lojinha: as denúncias pros donos ---- */
  const L = { st: 'aberta', lista: null };
  const quando = t => { const m = Math.round((Date.now() - Date.parse(t)) / 6e4); return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };
  function linha(x){
    const alvoLink = x.tipo === 'post' ? `#/p/${encodeURIComponent(x.alvo)}` : x.handle ? `#/@${encodeURIComponent(x.handle)}` : '';
    const midia = /^https:\/\//.test(x.midia || '') ? `<img class="den-l-img" src="${esc(x.midia)}" alt="" loading="lazy">` : '';
    const tira = (x.tipo === 'post' || x.tipo === 'story') && x.existe;
    return `<li class="den-l" data-k="${esc(x.tipo + ':' + x.alvo)}">
      <div class="den-l-c"><span class="den-l-tag">${esc(OQUE_T[x.tipo] || x.tipo)}</span><b>${x.handle ? '@' + esc(x.handle) : 'Perfil apagado'}</b>
        <small>${x.n} ${x.n === 1 ? 'denúncia' : 'denúncias'} · ${esc((x.motivos || []).map(m => ROTULO[m] || m).join(', '))} · ${esc(quando(x.ultima))}</small></div>
      ${midia}${x.trecho ? `<blockquote class="den-l-tr">${esc(x.trecho)}</blockquote>` : ''}
      ${(x.textos || []).length ? `<ul class="den-l-tx">${x.textos.map(t => `<li>“${esc(t)}”</li>`).join('')}</ul>` : ''}
      ${!x.existe ? `<p class="fine">${x.tipo === 'post' ? 'O post' : x.tipo === 'story' ? 'O story' : 'O perfil'} já saiu do ar.</p>` : ''}
      ${L.st === 'aberta' ? `<div class="acts">${alvoLink && x.existe ? `<a class="btn sm" href="${alvoLink}">Ver</a>` : ''}${tira ? `<button type="button" class="btn sm pri" data-act="den-res" data-t="${esc(x.tipo)}" data-id="${esc(x.alvo)}" data-a="tirar">${ico('trash')} Tirar do ar</button>` : ''}<button type="button" class="btn sm" data-act="den-res" data-t="${esc(x.tipo)}" data-id="${esc(x.alvo)}" data-a="ok">${ico('check')} Tá tudo certo</button></div>` : ''}
    </li>`;
  }
  function pinta(el){
    if(!el) return;
    const ls = L.lista || [];
    const abas = `<div class="den-abas" role="group" aria-label="Quais denúncias">${[['aberta', 'Esperando'], ['tirada', 'Tiradas do ar'], ['ok', 'Tava tudo certo']].map(([k, t]) => `<button type="button" class="btn sm${L.st === k ? ' pri' : ''}" data-act="den-st" data-k="${k}" aria-pressed="${L.st === k}">${t}</button>`).join('')}</div>`;
    el.innerHTML = `<section class="card lo-den${L.st === 'aberta' && ls.length ? ' tem' : ''}" aria-labelledby="lo-dn"><h2 class="ch" id="lo-dn">${ico('bandeira')} Denúncias${L.st === 'aberta' && ls.length ? ` <span class="den-n">${ls.length}</span>` : ''}</h2>
      ${abas}
      ${L.lista === null ? '<p class="fine">Lendo…</p>' : ls.length ? `<ul class="den-ls">${ls.map(linha).join('')}</ul>`
        : `<p class="fine">${L.st === 'aberta' ? 'Nenhuma denúncia esperando. A Google pede que a gente olhe o que chega: quando chegar, o celular dos donos apita.' : 'Nada por aqui.'}</p>`}</section>`;
  }
  async function lojinha(el){
    if(!el) return;
    L.el = el;
    try{ L.lista = await C.api.rpc('corre_denuncias_lista', { p_status: L.st, p_lim: 60 }) || []; }
    catch(e){ if(semFn(e)){ el.innerHTML = ''; return; } L.lista = []; }
    pinta(el);
  }

  Object.assign(C.acts, {
    'den-abre': el => abre({ tipo: el.dataset.t, id: el.dataset.id, h: el.dataset.h, ctx: el.dataset.ctx || null }),
    'den-motivo': el => {
      if(!D) return; D.motivo = el.dataset.k;
      document.querySelectorAll('.den-m').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      const m = C.$('den-manda'); if(m) m.disabled = false;
    },
    'den-manda': el => manda(el),
    'den-perfil': el => perfil(el),
    'den-bloq': async el => {
      const id = el.dataset.id, h = el.dataset.h, on = el.dataset.on === '1';
      if(!on && el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('lock')} Toca de novo pra bloquear @${esc(h)}`; return; }
      try{ await bloqueia(id, !on); C.closeSheet(); C.toast(on ? `@${h} desbloqueado.` : `@${h} bloqueado: não te manda mensagem nem te vê na cidade.`, 3600); }
      catch(e){ C.toast(C.errMsg(e)); }
    },
    'den-st': el => { L.st = el.dataset.k; L.lista = null; pinta(L.el); lojinha(L.el); },
    'den-res': async el => {
      const a = el.dataset.a;
      if(a === 'tirar' && el.dataset.armed !== '1'){ el.dataset.armed = '1'; el.classList.add('armed'); el.innerHTML = `${ico('trash')} Tirar mesmo?`; return; }
      el.disabled = true;
      try{
        const r = await C.api.rpc('corre_denuncia_resolve', { p_tipo: el.dataset.t, p_alvo: el.dataset.id, p_acao: a });
        if(!r || r.ok === false){ C.toast('Não deu agora. Tenta de novo.'); el.disabled = false; return; }
        C.toast(a === 'tirar' ? 'Tirado do ar.' : 'Marcado como visto.', 2600);
        if(C.sinaisAtualiza) C.sinaisAtualiza();
        await lojinha(L.el);
      }catch(e){ el.disabled = false; C.toast(C.errMsg(e)); }
    }
  });

  C.denuncia = { abre, perfil, lojinha, MOTIVOS };
})();
