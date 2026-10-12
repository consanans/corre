/* CORRE · CONTROLE DE JOGO NA TELA (v3.40)
   No celular, o Correverso ganha controle de videogame: o direcional (joystick) embaixo à esquerda e o botão de pular
   (ou buzinar, de moto e de carro) embaixo à direita. O botão de ação (Entrar, Sentar, Comer, Abrir...) fica logo acima
   do Pular, pro mesmo dedão. Serve pra cidade e pra dentro das casas. No computador continua o teclado: setas ou W A S D,
   espaço pula, E ou Enter faz a ação.
   C.pad = { cria(host, { pula, rotulo }), toque() } → { vetor(), mostra(on), solta(), rotulo(html), destroi() } */
(function(){
  'use strict';
  const C = window.Corre; if(!C) return;
  const { ico } = C;
  /* tela de toque (celular, tablet): é onde o controle aparece */
  const toque = () => { try{ return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0; }catch(e){ return false; } };
  const MORTA = .16;
  function cria(host, o){
    o = o || {};
    const el = document.createElement('div'); el.className = 'pad'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="pad-stick"><i class="pad-base"><b></b><b></b><b></b><b></b></i><i class="pad-dot"></i></div>
      <button type="button" class="pad-b pad-pula" tabindex="-1">${ico('up')}<span>Pular</span></button>`;
    host.appendChild(el);
    const st = el.querySelector('.pad-stick'), dot = el.querySelector('.pad-dot'), bp = el.querySelector('.pad-pula');
    let id = null, cx = 0, cy = 0, R = 46, vx = 0, vy = 0, rot = '';
    function solta(){ id = null; vx = vy = 0; dot.style.transform = ''; st.classList.remove('on'); }
    function move(ev){
      if(ev.pointerId !== id) return;
      let dx = ev.clientX - cx, dy = ev.clientY - cy; const d = Math.hypot(dx, dy);
      if(d > R){ dx = dx / d * R; dy = dy / d * R; }
      dot.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`; vx = dx / R; vy = dy / R;
    }
    st.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation(); if(id != null) return;
      id = ev.pointerId; try{ st.setPointerCapture(id); }catch(e){}
      const r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = Math.max(30, r.width * .36);
      st.classList.add('on'); move(ev);
    });
    st.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => st.addEventListener(t, ev => { if(ev.pointerId === id) solta(); }));
    /* o botão responde no toque (não espera o clique), e o dedo pode estar no direcional ao mesmo tempo */
    bp.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); bp.classList.add('on'); if(o.pula) o.pula(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => bp.addEventListener(t, () => bp.classList.remove('on')));
    el.addEventListener('contextmenu', ev => ev.preventDefault());
    return {
      el,
      /* pra onde o dedo aponta: x (direita +) e y (baixo +), de -1 a 1, e a força (0 parado) */
      vetor(){ const m = Math.hypot(vx, vy); return m < MORTA ? { x: 0, y: 0, m: 0 } : { x: vx, y: vy, m: Math.min(1, m) }; },
      ativo: () => id != null,
      mostra(on){ el.hidden = !on; if(!on){ solta(); bp.classList.remove('on'); } },
      solta,
      /* o rótulo do botão da direita: Pular, Buzinar, Trim-trim... */
      rotulo(k, txt){ if(rot === k + txt) return; rot = k + txt; bp.innerHTML = `${ico(k)}<span>${txt}</span>`; },
      destroi(){ solta(); el.remove(); }
    };
  }
  C.pad = { cria, toque };
})();
