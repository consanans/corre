/* CORRE · O TRAMPO VIRA JOGO (v4.29)
   O Thales: "trabalho vira jogo: fechou tarefa no Caderninho, programou post ou chamou cliente, ganha correal e coisa na
   cidade". O trabalho de verdade, feito nas ferramentas, paga 0,02 de correal (até 0,20 por dia, à parte do 1,00 que a
   cidade paga) e conta os dias seguidos de trampo, que viram a placa na frente da tua casa no Correverso. O app só diz o
   que foi feito; o banco confere que é teu e que aconteceu, e paga uma vez (delta-v429.sql). Aqui: chamar o banco e
   mostrar a moedinha que sobe no canto. Sem o delta, nada aparece (e não pergunta de novo até recarregar). */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  const T = { off: false, fila: Promise.resolve(), vistos: new Set(), el: null, t: 0 };
  const NOME = { caderno: 'tarefa feita', post: 'post no Studio', lead: 'cliente chamado' };
  /* a placa da casa muda de material com os dias seguidos (nada de verde: madeira, prata, ouro e o rosa da lenda) */
  const NIVEIS = [[30, 'lenda', 'Lenda do corre'], [14, 'ouro', 'Placa de ouro'], [7, 'prata', 'Placa de prata'], [2, 'madeira', 'Placa de madeira']];
  const nivel = n => { const x = NIVEIS.find(v => n >= v[0]); return x ? { k: x[1], nome: x[2], de: x[0] } : null; };
  const MARCOS = [3, 7, 14, 30, 60, 100];
  const hoje = () => C.hojeBR();
  const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };

  /* o que foi feito: um por vez na fila (o mês do Studio programa 12 posts seguidos), e o mesmo item uma vez por dia */
  function ganha(tipo, id){
    if(T.off || !id || !NOME[tipo] || !C.st.me) return Promise.resolve(null);
    const k = `${tipo}:${id}:${hoje()}`;
    if(T.vistos.has(k)) return Promise.resolve(null);
    T.vistos.add(k);
    const p = T.fila.then(() => pede(tipo, id));
    T.fila = p.catch(() => null);
    return p;
  }
  async function pede(tipo, id){
    let r = null;
    try{ r = await C.api.rpc('corre_correal_trampo', { p_tipo: tipo, p_ref: id }); }
    catch(e){
      /* o banco ainda não tem o trampo (delta-v429.sql): fica quieto até recarregar */
      if(e && (e.code === 'PGRST202' || e.code === '42883' || /corre_correal_trampo/.test(String(e.message || '')))) T.off = true;
      return null;
    }
    /* não aconteceu ainda (o post virou rascunho, a tarefa foi desmarcada): pode tentar de novo quando acontecer */
    if(r && r.motivo === 'nao') T.vistos.delete(`${tipo}:${id}:${hoje()}`);
    if(!r || !r.ok) return r;
    if(r.saldo != null && C.correalSet) C.correalSet(r.saldo, C.correal && C.correal.hoje);
    mostra(r, tipo);
    return r;
  }

  /* a moedinha: sobe no canto de baixo, diz o que rendeu e os dias seguidos; não tampa o aviso de cima */
  function mostra(r, tipo){
    const g = Number(r.ganhou) || 0, seq = Number(r.seq) || 0, novo = !!r.novo_dia;
    const marco = novo && MARCOS.includes(seq), nv = nivel(seq), nvAntes = nivel(seq - 1);
    const subiu = novo && nv && (!nvAntes || nvAntes.k !== nv.k);
    let titulo, sub;
    if(g > 0){ titulo = `+${C.correalFmt ? C.correalFmt(g) : g} correal`; sub = `${NOME[tipo]}${seq >= 2 ? ` · ${seq} dias seguidos de trampo` : ''}`; }
    else if(novo){ titulo = 'Dia de trampo contado'; sub = seq >= 2 ? `${seq} dias seguidos` : 'Amanhã, mais um e começa a sequência'; }
    else {
      /* bateu o teto do dia: avisa uma vez só */
      if(lsGet('corre-trampo-teto') === hoje()) return;
      lsSet('corre-trampo-teto', hoje());
      titulo = 'O trampo já rendeu o de hoje'; sub = `${C.correalFmt ? C.correalFmt(r.teto_trampo || .2) : '0,20'} correal por dia. Amanhã tem mais.`;
    }
    if(subiu) sub += `. Tua casa no Correverso ganhou a ${nv.nome.toLowerCase()}!`;
    else if(marco) sub += '!';
    const el = T.el && T.el.isConnected ? T.el : (T.el = Object.assign(document.createElement('div'), { className: 'tp-moeda', id: 'tp-moeda' }));
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.className = `tp-moeda${marco || subiu ? ' tp-marco' : ''}${nv ? ' tp-' + nv.k : ''}`;
    el.innerHTML = `<span class="tp-c" aria-hidden="true">${ico(g > 0 ? 'correal' : 'fogo')}</span><span class="tp-tx"><b>${esc(titulo)}</b><small>${esc(sub)}</small></span>${seq >= 2 ? `<span class="tp-seq" aria-hidden="true">${ico('fogo')}<b class="num">${seq}</b></span>` : ''}`;
    if(!el.isConnected) document.body.appendChild(el);
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(T.t); T.t = setTimeout(() => { el.classList.remove('on'); }, marco || subiu ? 5200 : 3200);
    if(navigator.vibrate && (marco || subiu)) try{ navigator.vibrate([18, 40, 18]); }catch(e){}
  }

  /* a carteira (Correverso): os dias seguidos, o melhor e o que o trampo rendeu hoje */
  async function meu(){ try{ return await C.api.rpc('corre_trampo_meu', {}); }catch(e){ return null; } }
  /* as placas da cidade: { id: dias } */
  async function placas(){ try{ return (await C.api.rpc('corre_trampo_placas', {})) || {}; }catch(e){ return {}; } }

  C.trampo = { ganha, meu, placas, nivel, NIVEIS };
})();
