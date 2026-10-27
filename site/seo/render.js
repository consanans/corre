/* CORRE · as páginas abertas (v5.0, "Londrina no Google"): o desenho de quem faz e dos pedidos. O mesmo arquivo serve
   pro gerador (ferramentas/seo/gera.mjs, no Node, antes do zip: é o que o Google lê) e pro navegador (seo.js, que troca
   a lista pela de agora quando a página abre). Sem nada do app: a página abre leve, sem o Corre inteiro. */
/* global module */
(function(raiz){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  /* as iniciais de quem não tem foto (até duas letras) */
  const ini = n => String(n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  /* o preço do jeito daqui, sem depender do idioma do computador que gera: R$ 1.250,00 */
  const preco = v => { const n = Number(v); if(v == null || v === '' || !isFinite(n) || n <= 0) return ''; const [i, d] = n.toFixed(2).split('.'); return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d; };
  const QUANDO = { urgente: 'Urgente', semana: 'Essa semana', mes: 'Esse mês', sem_pressa: 'Sem pressa' };
  /* a data curta (27/10): a página gerada fica dias no ar, então "há 2 dias" envelheceria */
  const data = em => { const d = new Date(em); if(isNaN(d)) return ''; const b = new Date(d.getTime() - 3 * 3600e3); return String(b.getUTCDate()).padStart(2, '0') + '/' + String(b.getUTCMonth() + 1).padStart(2, '0'); };
  const handleOk = h => /^[a-z0-9_.]{3,24}$/.test(String(h || ''));
  const fotoOk = u => /^https:\/\/[A-Za-z0-9.-]+\//.test(String(u || ''));

  /* um cartão de quem faz: a foto, o nome, o @, o que faz, a cidade (quando é de fora) e até 3 itens da vitrine. O toque
     leva pro link na bio da pessoa (lá tem o orçamento, o WhatsApp e o resto) */
  function cartao(p, o){
    if(!p || !handleOk(p.handle)) return '';
    const longe = !p.aqui && p.cidade, itens = (p.itens || []).filter(i => i && i.nome).slice(0, 3);
    return `<article class="sx-p">
      <a class="sx-p-a" href="/@${esc(p.handle)}" data-marca="perfil">
        ${fotoOk(p.avatar) ? `<img class="sx-av" src="${esc(p.avatar)}" alt="" width="56" height="56" loading="lazy" decoding="async">` : `<span class="sx-av sx-av-i" aria-hidden="true">${esc(ini(p.nome || p.handle))}</span>`}
        <span class="sx-p-tx"><b>${esc(p.nome || '@' + p.handle)}</b><small>@${esc(p.handle)}${longe ? ` · ${esc(p.cidade)}${o && o.digital ? ', à distância' : ''}` : ''}</small></span>
      </a>
      ${p.faz ? `<p class="sx-p-faz">${esc(p.faz)}</p>` : ''}
      ${itens.length ? `<ul class="sx-p-it">${itens.map(i => `<li><span>${esc(i.nome)}</span>${preco(i.preco) ? `<b>${esc(preco(i.preco))}</b>` : ''}</li>`).join('')}</ul>` : ''}
      <a class="sx-p-ir" href="/@${esc(p.handle)}" data-marca="perfil">Ver o trabalho e pedir orçamento</a>
    </article>`;
  }
  /* um pedido aberto do Mural: o que é, pra quando e o dia. Quem faz o serviço toca e manda proposta pelo Corre */
  function pedido(m){
    if(!m || !/^[A-Za-z0-9]{3,16}$/.test(String(m.codigo || ''))) return '';
    const q = [QUANDO[m.quando], data(m.em), m.remoto ? 'pode ser à distância' : ''].filter(Boolean).join(' · ');
    return `<li><a href="/#/mural/p/${esc(m.codigo)}" data-marca="perfil">${esc(m.titulo || 'Pedido')}</a>${q ? `<small>${esc(q)}</small>` : ''}</li>`;
  }
  /* o que entra na página de um ramo: quem é daqui e (no ramo que dá pra fazer à distância) quem é de fora */
  function doRamo(dados, ramo){
    const g = ((dados && dados.gente) || []).filter(p => p && p.categoria === ramo.k);
    return { aqui: g.filter(p => p.aqui), longe: ramo.digital ? g.filter(p => !p.aqui) : [], pedidos: ((dados && dados.pedidos) || []).filter(m => m && m.categoria === ramo.k) };
  }
  const vazioGente = (ramo, cidade) => `<p class="sx-vazio">Ainda não tem ninguém de ${esc((ramo.curto || ramo.nome).toLowerCase())} de ${esc(cidade)} listado aqui. Fixa teu pedido aqui embaixo: ele chega pra quem faz isso no Corre, e quem entrar depois também vê.</p>`;
  const vazioPedidos = () => '<li class="sx-vazio">Nenhum pedido aberto agora. O teu pode ser o primeiro.</li>';

  const R = { esc, ini, preco, data, cartao, pedido, doRamo, vazioGente, vazioPedidos, QUANDO };
  if(typeof module !== 'undefined' && module.exports) module.exports = R; else raiz.SeoRender = R;
})(typeof window !== 'undefined' ? window : this);
