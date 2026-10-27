/* CORRE · DÁ UM CORRE (v5.03)
   O Thales: "um local onde as pessoas fazem uma doação espontânea pra ajudarmos entidades carentes de Londrina". Ele
   escolheu: o Pix direto pra entidade (o dinheiro nunca passa pelo Corre: nada de repasse, imposto ou prestação de
   contas), a lista aprovada pelo Corre (ninguém consegue pôr o próprio Pix fingindo ser entidade) e o botão no link na
   bio de cada um ("Eu apoio: ..."). "Dar um corre" é dar uma força: quem passa pela página doa o quanto quiser.
     C.doa.lista()              as entidades ligadas (a lista aberta do banco; guardada enquanto a página tá aberta)
     C.doa.abre(id, h)          a folha de doar: o Pix copia e cola montado aqui, a chave, o QR e como conferir
     C.doa.cartao(e, o)         o cartão "Eu apoio" do link na bio (a pública e a prévia do editor usam o mesmo)
     C.doa.lojinha(el)          a lista dos donos na Lojinha: pôr, mexer, ligar e desligar, e os toques de cada uma
     C.doa.pix(chave, nome, cidade)  o BR Code (o "Pix copia e cola") estático, sem valor
   O Corre só conta quantas vezes abriram, copiaram ou abriram o QR de cada entidade (sem saber quem nem quanto). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico, toast } = C;

  const CAUSAS = { criancas: 'Crianças', idosos: 'Idosos', animais: 'Animais', saude: 'Saúde', fome: 'Fome', educacao: 'Educação',
    deficiencia: 'Pessoas com deficiência', rua: 'Gente em situação de rua', mulheres: 'Mulheres', outra: 'Causa social' };
  const causaNome = k => CAUSAS[k] || CAUSAS.outra;
  const cnpjFmt = s => String(s || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const semFn = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || ''));

  /* ---------- o Pix copia e cola: o BR Code estático do Banco Central (EMV), com a chave, o nome e a cidade de quem
     recebe e sem valor (quem doa escolhe no banco). Cada campo é id + tamanho + valor, e o fim é o CRC16-CCITT ---------- */
  const limpo = (t, n) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 .&-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  function crc16(s){
    let c = 0xFFFF;
    for(let i = 0; i < s.length; i++){ c ^= s.charCodeAt(i) << 8; for(let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  function pix(chave, nome, cidade){
    const k = /@/.test(chave) ? String(chave).trim().toLowerCase() : String(chave || '').trim();
    const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const base = tlv('00', '01') + tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', k)) + tlv('52', '0000') + tlv('53', '986') + tlv('58', 'BR')
      + tlv('59', limpo(nome, 25) || 'ENTIDADE') + tlv('60', limpo(cidade, 15) || 'LONDRINA') + tlv('62', tlv('05', '***')) + '6304';
    return base + crc16(base);
  }

  /* ---------- a lista aberta (só as ligadas). Uma ida ao banco por página aberta ---------- */
  const L = { p: null, l: null };
  function lista(fresca){
    if(fresca) L.p = null;
    if(!L.p) L.p = Promise.resolve().then(() => C.api.rpc('corre_entidades_lista')).then(l => (L.l = Array.isArray(l) ? l : [])).catch(() => { L.p = null; return []; });
    return L.p;
  }
  /* a conta: abrir a folha, copiar o Pix e abrir o QR (de graça, sem esperar e sem reclamar se o banco não tiver) */
  const conta = (id, tipo) => { try{ const r = C.api.rpc('corre_doacao_marca', { p_entidade: id, p_tipo: tipo }); if(r && r.catch) r.catch(() => {}); }catch(e){} };
  /* no link na bio, a conta da dona da página também (o "Quem passou" dela mostra quem abriu e quem copiou) */
  const contaBio = (h, k) => { if(!h || !C.api.rpc) return; try{ const r = C.api.rpc('corre_bio_marca', { p_handle: h, p_chave: k }); if(r && r.catch) r.catch(() => {}); }catch(e){} };

  /* ---------- o cartão "Eu apoio" do link na bio ---------- */
  function cartao(e, o){
    if(!e) return '';
    o = o || {};
    return `<section class="bio-doa" aria-label="Causa que apoio">
      <p class="bio-doa-k">${ico('heart')}<span>Eu apoio${e.causa && e.causa !== 'outra' ? ` · ${esc(causaNome(e.causa))}` : ''}</span></p>
      <b class="bio-doa-n">${esc(e.nome)}</b>${e.faz ? `<p class="bio-doa-f">${esc(e.faz)}</p>` : ''}
      <button type="button" class="bio-doa-b" data-act="doa-abre" data-bk="doa" data-id="${esc(e.id)}"${o.h ? ` data-h="${esc(o.h)}"` : ''}>${ico('heart')}<span><b>Dá um corre: doar no Pix</b><small>Direto pra entidade, o valor que quiser</small></span></button>
    </section>`;
  }

  /* ---------- a folha de doar ---------- */
  const F = { e: null, h: '', cc: '' };
  function folhaHTML(e){
    const cc = F.cc, quem = limpo(e.pix_nome || e.nome, 25);
    const links = [e.site ? `<a href="${esc(e.site)}" target="_blank" rel="noopener">o site</a>` : '', e.instagram ? `<a href="https://www.instagram.com/${esc(e.instagram)}/" target="_blank" rel="noopener">@${esc(e.instagram)}</a>` : ''].filter(Boolean);
    return `<div class="doa-f">
      <div class="sheet-head"><h2>${ico('heart')} Dá um corre</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="doa-k">${esc(causaNome(e.causa))}${e.cidade ? ` · ${esc(e.cidade)}` : ''}</p>
      <h3 class="doa-n">${esc(e.nome)}</h3>
      ${e.faz ? `<p class="doa-faz">${esc(e.faz)}</p>` : ''}
      <p class="doa-dir"><b>O dinheiro vai direto pra entidade</b>, pelo Pix dela. O Corre não fica com nada e nem sabe quanto você doou. Qualquer valor ajuda.</p>
      <ol class="doa-passos"><li>Copia o Pix aqui embaixo.</li><li>No app do teu banco: Pix › <b>Pix copia e cola</b>.</li><li>Põe o valor que quiser e confere se quem recebe é <b>${esc(quem)}</b>.</li></ol>
      <label class="doa-cc-l" for="doa-cc">Pix copia e cola</label>
      <textarea id="doa-cc" class="inp doa-cc" readonly rows="3" spellcheck="false">${esc(cc)}</textarea>
      <div class="acts doa-acts"><button type="button" class="btn pri" data-act="doa-copia">${ico('copy')} Copiar o Pix</button><button type="button" class="btn" data-act="doa-qr" aria-controls="doa-qr">${ico('qr')} QR code</button></div>
      <div class="doa-qr" id="doa-qr" hidden></div>
      <p class="fine doa-chave">Ou a chave: <code>${esc(e.pix)}</code> <button type="button" class="btn sm doa-chave-b" data-act="doa-chave">${ico('copy')} Copiar a chave</button></p>
      <p class="fine doa-conf">${ico('escudo')} Conferida pelo Corre. CNPJ ${esc(cnpjFmt(e.cnpj))}${links.length ? ` · ${links.join(' · ')}` : ''}.</p>
    </div>`;
  }
  async function abre(id, h){
    const l = await lista();
    const e = l.find(x => x.id === id);
    if(!e){ toast('Essa entidade não tá mais na lista do Corre.'); return; }
    F.e = e; F.h = h || ''; F.cc = pix(e.pix, e.pix_nome || e.nome, e.cidade);
    conta(e.id, 'abre');
    C.sheet(folhaHTML(e), 'doa-folha');
  }

  /* ---------- a Lojinha: as entidades (só os donos) ---------- */
  const D = { el: null, r: null, erro: null, dias: 30 };
  const VAZIA = { nome: '', faz: '', causa: 'outra', cidade: 'Londrina', cnpj: '', pix: '', pix_nome: '', site: '', instagram: '', foto: '', ativa: true };
  function lojinhaHTML(){
    const r = D.r, ls = (r && r.entidades) || [];
    const cab = `<section class="card lo-doa" aria-labelledby="lo-dc"><h2 class="ch" id="lo-dc">${ico('heart')} Dá um Corre: as entidades <small>(${D.dias} dias)</small></h2>`;
    if(D.erro === 'falta') return cab + '<p class="fine">As entidades ligam quando o delta-v503.sql rodar no banco.</p></section>';
    if(!r) return cab + '<p class="fine">Lendo…</p></section>';
    const linha = e => `<li class="lo-doa-i${e.ativa ? '' : ' off'}"><span class="lo-doa-t"><b>${esc(e.nome)}</b><small>${esc(causaNome(e.causa))} · CNPJ ${esc(cnpjFmt(e.cnpj))} · Pix ${esc(e.pix)}${e.ativa ? '' : ' · <em>desligada</em>'}</small></span>
      <span class="lo-doa-n"><span><b class="num">${Number(e.abre) || 0}</b><small>abriram</small></span><span><b class="num">${Number(e.copia) || 0}</b><small>copiaram</small></span><span><b class="num">${Number(e.bios) || 0}</b><small>${Number(e.bios) === 1 ? 'link na bio' : 'links na bio'}</small></span></span>
      <span class="lo-doa-a"><button type="button" class="btn sm" data-act="doa-edita" data-id="${esc(e.id)}">${ico('edit')} Mexer</button><button type="button" class="btn sm" data-act="doa-liga" data-id="${esc(e.id)}" data-on="${e.ativa ? '0' : '1'}">${e.ativa ? 'Desligar' : 'Ligar'}</button></span></li>`;
    return cab + `<p class="fine">Só entidade conferida: com CNPJ e a chave Pix que a própria entidade passou. Quem tem link na bio escolhe uma da lista ligada, e o Pix vai direto pra ela.</p>
      ${ls.length ? `<ul class="lo-doa-l">${ls.map(linha).join('')}</ul>` : '<p class="fine"><b>Nenhuma ainda.</b> Põe a primeira: o botão aparece no editor do link na bio de todo mundo.</p>'}
      <div class="acts"><button type="button" class="btn pri" data-act="doa-nova">${ico('plus')} Pôr entidade</button></div>
      <p class="fine">"Abriram" é quem tocou em doar; "copiaram" é quem copiou o Pix ou a chave. Quanto foi doado só a entidade sabe.</p></section>`;
  }
  async function lojinha(el, dias){
    if(!el) return;
    D.el = el; if(dias) D.dias = dias;
    el.innerHTML = lojinhaHTML();
    try{ D.r = await C.api.rpc('corre_entidades_donos', { p_dias: D.dias }); D.erro = null; }
    catch(e){ D.r = null; D.erro = semFn(e) ? 'falta' : 'erro'; if(D.erro === 'erro'){ el.innerHTML = ''; return; } }
    el.innerHTML = lojinhaHTML();
  }
  const ERROS = { nome: 'O nome vai de 2 a 80 letras.', cnpj: 'O CNPJ tem 14 números.', pix: 'Essa chave não é Pix: CNPJ, CPF, celular com +55, e-mail ou a aleatória.',
    pix_nome: 'O nome no Pix vai com letras e números, até 25.', site: 'O site precisa começar com https://.', instagram: 'O Instagram é só o @, sem espaço.',
    foto: 'A foto precisa ser um endereço https://.', cnpj_repetido: 'Já tem uma entidade com esse CNPJ na lista.', limite: 'A lista vai até 60 entidades.', so_dono: 'Só os donos mexem na lista.' };
  function formHTML(e){
    const op = Object.entries(CAUSAS).map(([k, n]) => `<option value="${k}"${e.causa === k ? ' selected' : ''}>${esc(n)}</option>`).join('');
    return `<form class="form doa-form" id="doa-form" novalidate>
      <div class="sheet-head"><h2>${e.id ? 'Mexer na entidade' : 'Pôr entidade'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      <p class="fine">Pega a chave Pix com a própria entidade (no site oficial ou falando com ela). O nome no Pix é o que o banco mostra pra quem doa.</p>
      <div class="fld"><label for="dz-nome">Nome</label><input class="inp" id="dz-nome" maxlength="80" required value="${esc(e.nome)}"></div>
      <div class="fld"><label for="dz-faz">O que faz <small>(uma ou duas frases)</small></label><textarea class="inp" id="dz-faz" maxlength="280" rows="3">${esc(e.faz)}</textarea></div>
      <div class="row2"><div class="fld"><label for="dz-causa">Causa</label><select class="inp" id="dz-causa">${op}</select></div>
        <div class="fld"><label for="dz-cidade">Cidade</label><input class="inp" id="dz-cidade" maxlength="60" value="${esc(e.cidade || 'Londrina')}"></div></div>
      <div class="row2"><div class="fld"><label for="dz-cnpj">CNPJ</label><input class="inp" id="dz-cnpj" inputmode="numeric" maxlength="18" required value="${esc(cnpjFmt(e.cnpj))}" placeholder="00.000.000/0000-00"></div>
        <div class="fld"><label for="dz-pix">Chave Pix</label><input class="inp" id="dz-pix" maxlength="77" required value="${esc(e.pix)}" placeholder="CNPJ, e-mail, celular ou aleatória"></div></div>
      <div class="row2"><div class="fld"><label for="dz-pn">Nome no Pix <small>(até 25, opcional)</small></label><input class="inp" id="dz-pn" maxlength="25" value="${esc(e.pix_nome)}" placeholder="Sai do nome"></div>
        <div class="fld"><label for="dz-ig">Instagram <small>(opcional)</small></label><input class="inp" id="dz-ig" maxlength="31" value="${e.instagram ? '@' + esc(e.instagram) : ''}" placeholder="@entidade"></div></div>
      <div class="fld"><label for="dz-site">Site <small>(opcional)</small></label><input class="inp" id="dz-site" maxlength="200" inputmode="url" value="${esc(e.site)}" placeholder="https://"></div>
      <p class="fine doa-form-e" id="dz-e" role="alert"></p>
      <div class="acts"><button type="submit" class="btn pri" id="dz-ok">${ico('check')} ${e.id ? 'Salvar' : 'Pôr na lista'}</button></div>
    </form>`;
  }
  function formAbre(e){
    C.sheet(formHTML(e), 'doa-form-sh');
    const f = $('doa-form'); if(!f) return;
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const er = $('dz-e'), ok = $('dz-ok'), v = id => ($(id) || {}).value || '';
      const cnpj = v('dz-cnpj').replace(/\D/g, '');
      if(v('dz-nome').trim().length < 2){ er.textContent = ERROS.nome; $('dz-nome').focus(); return; }
      if(!C.docOk(cnpj) || cnpj.length !== 14){ er.textContent = 'Esse CNPJ não confere (os dígitos do fim não batem). Confere com a entidade.'; $('dz-cnpj').focus(); return; }
      if(v('dz-pix').trim().length < 5){ er.textContent = ERROS.pix; $('dz-pix').focus(); return; }
      const site = v('dz-site').trim();
      const p = { nome: v('dz-nome').trim(), faz: v('dz-faz').trim(), causa: v('dz-causa'), cidade: v('dz-cidade').trim() || 'Londrina', cnpj, pix: v('dz-pix').trim(),
        pix_nome: v('dz-pn').trim(), instagram: v('dz-ig').trim().replace(/^@/, '').toLowerCase(), site: site && !/^https?:\/\//i.test(site) ? 'https://' + site : site };
      if(e.id) p.id = e.id;
      ok.disabled = true; er.textContent = '';
      try{
        await C.api.rpc('corre_entidade_salva', { p });
        C.closeSheet(); L.p = null;
        toast(e.id ? 'Entidade salva.' : 'Entidade na lista. Já aparece no editor do link na bio de todo mundo.', 3600);
        lojinha(D.el);
      }catch(x){
        const k = String((x && (x.hint || x.message)) || '').match(/\b(so_dono|nome|cnpj_repetido|cnpj|pix_nome|pix|site|instagram|foto|limite)\b/);
        er.textContent = k ? ERROS[k[1]] : C.errMsg(x, 'Não deu pra salvar agora.');
        ok.disabled = false;
      }
    });
  }

  Object.assign(C.acts, {
    'doa-abre': el => {
      const b = el.closest('.bio');
      if(b && b.classList.contains('prev')) return toast('É a prévia: na página de verdade, esse botão abre o Pix da entidade.');
      abre(el.dataset.id, el.dataset.h || (b && b.dataset.h) || '');
    },
    'doa-copia': () => {
      if(!F.e) return;
      C.copy(F.cc, 'Pix copiado. No app do banco: Pix › Pix copia e cola.');
      conta(F.e.id, 'copia'); contaBio(F.h, 'doa-pix');
    },
    'doa-chave': () => { if(!F.e) return; C.copy(F.e.pix, 'Chave Pix copiada.'); conta(F.e.id, 'copia'); contaBio(F.h, 'doa-pix'); },
    /* o QR mora no Studio Houzi (desce só agora, como o QR do link na bio) */
    'doa-qr': async el => {
      const box = $('doa-qr'); if(!box || !F.e) return;
      if(!box.hidden){ box.hidden = true; el.setAttribute('aria-expanded', 'false'); return; }
      box.hidden = false; el.setAttribute('aria-expanded', 'true'); box.innerHTML = '<p class="fine">Desenhando…</p>';
      conta(F.e.id, 'qr');
      try{
        await C.houziCarrega();
        const blob = await C.labMotor.png(C.labMotor.qrSvg(F.cc, { titulo: `Pix pra ${F.e.nome}` }), 720, 720, 'image/png');
        if(!F.e) return;
        box.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="QR do Pix pra ${esc(F.e.nome)}"><p class="fine">Abre o app do banco no outro celular e aponta a câmera (Pix › Ler QR code).</p>`;
      }catch(x){ box.innerHTML = '<p class="fine">Não deu pra desenhar o QR agora. Copia o Pix aqui em cima.</p>'; }
    },
    'doa-nova': () => formAbre(Object.assign({}, VAZIA)),
    'doa-edita': el => { const e = ((D.r && D.r.entidades) || []).find(x => x.id === el.dataset.id); if(e) formAbre(Object.assign({}, VAZIA, e)); },
    'doa-liga': async el => {
      const e = ((D.r && D.r.entidades) || []).find(x => x.id === el.dataset.id); if(!e) return;
      const on = el.dataset.on === '1';
      el.disabled = true;
      try{ await C.api.rpc('corre_entidade_salva', { p: Object.assign({}, e, { ativa: on }) }); L.p = null; toast(on ? `${e.nome} ligada: volta pra lista.` : `${e.nome} desligada: some dos links na bio até ligar de novo.`, 3600); lojinha(D.el); }
      catch(x){ el.disabled = false; toast(C.errMsg(x)); }
    }
  });

  C.doa = { lista, abre, cartao, lojinha, pix, CAUSAS, causaNome };
})();
