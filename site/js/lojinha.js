/* CORRE · A LOJINHA (v4.02, o painel do dono)
   O Thales: "prioridade agora: montar meu dashboard" e "chama esse lugar de lojinha". Uma página só do fundador
   (#/lojinha, no Financeiro) que lê o banco ao vivo (corre_lojinha, delta-v402.sql): quanta gente tá usando, quem
   voltou, onde quem chega trava, o que se usa, o link na bio, os convites, os planos e a IA. É tudo contagem: o
   dinheiro, os clientes e as conversas de cada um seguem só de cada um. Ele e o @corre ficam fora da conta de gente.
   O alto da página é a leitura (o que os números dizem, em frase); embaixo, os números pra quem quer olhar.
   Também mora aqui a marca do dia (C.marcaDia): o app avisa o banco uma vez por dia por aparelho que a pessoa abriu o
   Corre, pra "ativo" contar também quem só abriu e olhou.
   v4.06: os lembretes no celular (corre_lembretes_numeros, delta-v406.sql): quanta gente ligou os avisos, quantos
   lembretes saíram e quantos voltaram; e, em quem chegou por último, o botão de dar as boas-vindas no WhatsApp (o
   número que a pessoa deixou público no perfil; a mensagem sai pronta e quem manda é o dono, no WhatsApp dele). */
(function(){
  'use strict';
  const C = window.Corre, { $, esc, ico } = C, api = C.api, st = C.st;
  const PERIODOS = [7, 30, 90];
  const L = { dias: 30, r: null, em: 0, erro: null, lm: null, wa: {} };
  try{ const v = Number(localStorage.getItem('corre-lojinha-dias')); if(PERIODOS.includes(v)) L.dias = v; }catch(e){}

  /* ---------- a marca do dia (todo mundo, uma vez por dia por aparelho) ---------- */
  C.marcaDia = () => {
    if(!st.me || C.EMBED) return;
    const k = 'corre-dia:' + st.me.id, hj = C.hojeBR();
    let v = ''; try{ v = localStorage.getItem(k) || ''; }catch(e){}
    if(v === hj) return;
    try{ localStorage.setItem(k, hj); }catch(e){}
    try{ const r = api.rpc('corre_marca_dia', {}); if(r && r.catch) r.catch(() => {}); }catch(e){}
  };

  /* ---------- miudezas ---------- */
  const num = n => (Number(n) || 0).toLocaleString('pt-BR');
  const pct = (a, b) => b ? Math.round(100 * (Number(a) || 0) / b) : 0;
  const ddmm = dia => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dia || '')); return m ? `${m[3]}/${m[2]}` : ''; };
  const diasDesde = s => { const t = Date.parse(s); return isFinite(t) ? Math.floor((Date.now() - t) / 864e5) : null; };
  const haQuanto = s => { const d = diasDesde(s); return d === null ? '' : d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };
  const ultimoTxt = (dia, hoje) => { if(!dia) return 'ainda não voltou'; if(dia === hoje) return 'ativo hoje'; const d = Math.round((Date.parse(hoje) - Date.parse(dia)) / 864e5); return d === 1 ? 'ativo ontem' : `ativo há ${d} dias`; };
  const pessoas = n => `${num(n)} ${Number(n) === 1 ? 'pessoa' : 'pessoas'}`;
  /* o nome de cada coisa que o banco conta */
  const FERR = { feed: 'Postou no feed', stories: 'Postou story', msg: 'Mandou mensagem', grupos: 'Entrou em grupo', mural: 'Fixou pedido no Mural', propostas: 'Mandou proposta no Mural',
    studio: 'Programou post no Studio', houzi: 'Fez marca no Studio Houzi', horus: 'Caçou cliente no Hórus', vendas: 'Fez orçamento em Vendas', grana: 'Lançou na Grana',
    catalogo: 'Pôs item no catálogo', tarefas: 'Fez tarefa no Correverso', atelie: 'Comprou skin no Ateliê', ia: 'Usou a IA', instagram: 'Conectou o Instagram',
    avisos: 'Ligou os avisos no celular', linkbio: 'Teve visita no link na bio' };
  const LEMBRA = { bio: 'Visita no link na bio', mural: 'Pedido novo no Mural', passos: 'O que falta no perfil', feed: 'Post de quem a pessoa segue', concha: 'O show da Concha' };
  const IA = { legenda: 'Legendas (Studio)', imagem: 'Imagens (Studio)', abordagem: 'Abordagens (Hórus)', marca: 'Marcas (Studio Houzi)', nomes: 'Nomes (Studio Houzi)',
    direcao: 'Direção criativa (Studio Houzi)', maquina: 'Plataforma de marca (Studio Houzi)' };
  /* o caminho de quem chega, na ordem dos Primeiros passos: [chave, o que fez, o que falta (pra frase da leitura)] */
  const FUNIL = [['contas', 'Entrou com o Google'], ['perfil', 'Criou o perfil'], ['foto', 'Pôs foto', 'puseram foto'], ['faz', 'Disse o que vende', 'disseram o que vendem'],
    ['whats', 'Pôs o WhatsApp', 'puseram o WhatsApp pra cliente'], ['bio', 'Montou o link na bio', 'montaram o link na bio'], ['vitrine', 'Pôs preço na vitrine', 'puseram preço na vitrine'],
    ['post', 'Fez o primeiro post', 'postaram'], ['verso', 'Entrou no Correverso', 'entraram no Correverso'], ['convidou', 'Chamou alguém', 'chamaram alguém pro Corre']];

  /* ---------- a leitura: o que os números dizem, em frase (no máximo 4) ---------- */
  function leitura(r){
    const g = r.gente || {}, f = r.funil || {}, p = r.planos, out = [], lm = L.lm;
    const P = Number(f.perfil) || 0;
    if(P >= 3){
      const pior = FUNIL.filter(x => x[2] && f[x[0]] !== undefined && f[x[0]] !== null).map(x => [x, Number(f[x[0]]) || 0]).sort((a, b) => a[1] - b[1])[0];
      if(pior && pior[1] < P) out.push(['alvo', `O gargalo: só ${num(pior[1])} de ${num(P)} ${pior[0][2]}.`]);
    }
    /* v4.06: sem os avisos ligados, o lembrete não chega: é o primeiro número a mexer pra trazer gente de volta */
    if(lm && !lm.falta && Number(g.perfis) >= 3 && Number(lm.avisos) < Number(g.perfis) / 2)
      out.push(['bell', `Só ${num(lm.avisos)} de ${num(g.perfis)} ligaram os avisos no celular, e os lembretes só chegam pra quem ligou.`]);
    if(Number(g.sem_perfil) > 0) out.push(['eu', `${num(g.sem_perfil)} ${Number(g.sem_perfil) === 1 ? 'entrou' : 'entraram'} com o Google e ${Number(g.sem_perfil) === 1 ? 'parou' : 'pararam'} antes de criar o perfil.`]);
    if(Number(g.voltaram_base) >= 3) out.push(['raio', `Dos que entraram há mais de uma semana, ${pct(g.voltaram, g.voltaram_base)}% voltaram nos últimos 7 dias (${num(g.voltaram)} de ${num(g.voltaram_base)}).`]);
    if(g.novos7 !== undefined) out.push(['gente', `Essa semana ${Number(g.novos7) === 1 ? 'entrou 1 pessoa' : `entraram ${num(g.novos7)} pessoas`}; na anterior, ${num(g.novos7_antes)}.`]);
    if(p && !(Number(p.mrr) > 0)) out.push(['cartao', `Ninguém pagando plano ainda${Number(p.teste) ? `; ${pessoas(p.teste)} no teste grátis` : ''}.`]);
    return out.slice(0, 4);
  }

  /* ---------- as colunas (dia a dia): uma série por gráfico, a coluna inteira é o alvo do toque ---------- */
  function colunas(dias, k, nome, cor, hoje){
    const vals = dias.map(x => Number(x[k]) || 0), max = Math.max(1, ...vals), pico = vals.indexOf(Math.max(...vals));
    const fina = dias.length > 45;
    const cols = dias.map((x, i) => {
      const v = vals[i], h = v ? Math.max(4, Math.round(100 * v / max)) : 0;
      return `<span class="lo-col" tabindex="0" role="listitem" data-tip="${esc(`${x.dia === hoje ? 'Hoje' : ddmm(x.dia)} · ${pessoas(v)}`)}" aria-label="${esc(`${ddmm(x.dia)}: ${pessoas(v)}`)}"><i style="height:${h}%;background:${cor}"></i></span>`;
    }).join('');
    const ult = vals[vals.length - 1] || 0;
    return `<figure class="lo-graf">
      <figcaption><b>${esc(nome)}</b><span class="lo-graf-l">hoje <b class="num">${num(ult)}</b> · pico <b class="num">${num(vals[pico])}</b>${vals[pico] ? ` em ${ddmm(dias[pico].dia)}` : ''}</span></figcaption>
      <div class="lo-eixo"><span>${num(max)}</span><span>0</span></div>
      <div class="lo-cols${fina ? ' fina' : ''}" role="list" aria-label="${esc(nome)}, um por dia">${cols}</div>
      <div class="lo-x"><span>${ddmm(dias[0] && dias[0].dia)}</span><span>${ddmm(dias[Math.floor(dias.length / 2)] && dias[Math.floor(dias.length / 2)].dia)}</span><span>hoje</span></div>
    </figure>`;
  }
  /* barras deitadas (o caminho, o uso, a IA): o rótulo e o número ficam fora da barra, na cor do texto */
  function barras(L2, cor, cls){
    const max = Math.max(1, ...L2.map(x => Number(x.v) || 0));
    return `<ul class="lo-barras${cls ? ' ' + cls : ''}">${L2.map(x => `<li${x.marca ? ' class="marca"' : ''}><span class="lo-b-t">${esc(x.t)}${x.marca ? ` <em class="lo-queda">${esc(x.marca)}</em>` : ''}</span>
      <span class="lo-b-v num">${esc(x.vtxt || num(x.v))}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>
      <span class="lo-b-trilho" aria-hidden="true"><i style="width:${x.v ? Math.max(2, Math.round(100 * x.v / max)) : 0}%;background:${cor}"></i></span></li>`).join('')}</ul>`;
  }
  const tile = (rot, v, sub, cls) => `<div class="lo-tile${cls ? ' ' + cls : ''}"><span class="lo-tile-r">${rot}</span><b class="lo-tile-v">${v}</b>${sub ? `<span class="lo-tile-s">${sub}</span>` : ''}</div>`;
  const gente = L2 => L2 && L2.length ? `<ul class="lo-gente">${L2.map(p => `<li><a href="#/@${esc(p.handle || '')}">${C.avatar(p, 's')}<span class="lo-g-q"><b>${esc(p.nome || '@' + p.handle)}</b><small>@${esc(p.handle || '')}</small></span><b class="num lo-g-n">${num(p.n)}</b></a></li>`).join('')}</ul>` : '';

  /* v4.06: os lembretes no celular (o que saiu, de que tipo, e quem voltou no mesmo dia ou no seguinte) */
  function lembraHTML(lm, g, per){
    if(!lm) return '';
    const cab = `<section class="card lo-lembra" aria-labelledby="lo-lm"><h2 class="ch" id="lo-lm">Lembretes no celular <small>(${per})</small></h2>`;
    if(lm.falta) return cab + '<p class="fine">Os lembretes ligam quando o delta-v406.sql rodar no banco.</p></section>';
    const tipos = Object.entries(lm.tipos || {}).map(([k, v]) => ({ t: LEMBRA[k] || k, v: Number(v) || 0 })).sort((a, b) => b.v - a.v);
    return cab + `<div class="lo-tiles">${tile('Com os avisos ligados', num(lm.avisos), `de ${pessoas(g.perfis)} · ${num(lm.aparelhos)} ${Number(lm.aparelhos) === 1 ? 'aparelho' : 'aparelhos'}`)}
        ${tile('Lembretes enviados', num(lm.enviados), Number(lm.enviados) ? `pra ${pessoas(lm.pessoas)}` : 'nenhum no período')}
        ${tile('Voltaram', Number(lm.enviados) ? `${pct(lm.voltaram, lm.enviados)}%` : '–', Number(lm.enviados) ? `${num(lm.voltaram)} abriram o Corre no dia ou no seguinte` : '')}</div>
      ${tipos.length ? `<h3 class="lo-h3">O que saiu</h3>${barras(tipos, 'var(--blue)')}` : ''}
      <p class="fine">Saem das 17h às 21h pra quem não abriu o Corre no dia, só com novidade pra pessoa, no máximo um por dia e três por semana.${Number(lm.desligaram) ? ` ${pessoas(lm.desligaram)} ${Number(lm.desligaram) === 1 ? 'desligou' : 'desligaram'} os lembretes.` : ''}</p></section>`;
  }
  /* o botão das boas-vindas: o WhatsApp público da pessoa, com a mensagem pronta (quem manda é o dono, no WhatsApp dele) */
  function boasVindas(p){
    const w = L.wa[p.id]; if(!w || !/^\d{10,11}$/.test(w)) return '';
    const eu = C.firstName(st.me && st.me.nome), ela = C.firstName(p.nome || p.handle);
    const txt = `Oi, ${ela}! Aqui é o ${eu}, do Corre. Vi que você chegou agora, que bom ter você lá. Se precisar de uma mão pra montar teu perfil ou teu link na bio, me chama aqui.`;
    return `<a class="btn sm lo-wa" href="https://wa.me/55${w}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" aria-label="${esc(`Dar as boas-vindas a ${p.nome || '@' + p.handle} no WhatsApp`)}">${ico('wa')}<span>Boas-vindas</span></a>`;
  }

  /* ---------- a página ---------- */
  function pinta(app){
    const r = L.r, hoje = r.hoje || C.hojeBR(), g = r.gente || {}, f = r.funil || {}, dias = r.dias || [];
    const L1 = leitura(r);
    const voltou = Number(g.voltaram_base) ? `${pct(g.voltaram, g.voltaram_base)}%` : '–';
    const delta = Number(g.novos7) - Number(g.novos7_antes);
    /* o caminho: cada passo em relação a quem criou o perfil; a maior queda de um passo pro outro ganha o selo */
    const P = Number(f.perfil) || 0;
    const passos = FUNIL.filter(x => f[x[0]] !== undefined && f[x[0]] !== null).map(x => ({ k: x[0], t: x[1], v: Number(f[x[0]]) || 0 }));
    let queda = null, qv = 0; passos.forEach((x, i) => { if(i && x.k !== 'perfil'){ const q = passos[i - 1].v - x.v; if(q > qv){ qv = q; queda = x.k; } } });
    passos.forEach(x => { x.sub = x.k === 'contas' || !P ? '' : `${pct(x.v, P)}%`; if(x.k === queda && qv > 0) x.marca = 'maior queda'; });
    const usoT = (r.uso || []).filter(x => FERR[x.k]).map(x => ({ t: FERR[x.k], v: Number(x.n) || 0, total: Number(x.total) || 0 }))
      .sort((a, b) => b.v - a.v || b.total - a.total).map(x => Object.assign(x, { vtxt: num(x.v), sub: `desde sempre: ${num(x.total)}` }));
    /* o que ninguém usou (nem desde sempre) vira uma frase embaixo: menos linha zerada, e o vazio também é informação */
    const uso = usoT.filter(x => x.v || x.total), ninguem = usoT.filter(x => !x.v && !x.total).map(x => x.t);
    const bio = r.bio, cv = r.convites, pl = r.planos, ia = r.ia;
    const iaL = ia && ia.tipos ? Object.entries(ia.tipos).map(([k, v]) => ({ t: IA[k] || k, v: Number(v) || 0 })).sort((a, b) => b.v - a.v) : [];
    const per = `${L.dias} dias`;
    const hora = new Date(L.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    app.innerHTML = C.header('lojinha') + `<main class="wrap lo">
      <header class="lo-topo">
        <span class="mono">${ico('grafico')} Lojinha · só você vê</span>
        <h1 class="lo-titulo">Como tá a <span class="hl">lojinha</span></h1>
        <p class="note">O Corre por números, ao vivo do banco. Sem contar você e o @corre. Tudo contagem: o dinheiro e as conversas de cada um seguem só de cada um.</p>
      <div class="lo-filtro">
        <div class="lo-per" role="group" aria-label="Período">${PERIODOS.map(n => `<button type="button" class="btn sm${n === L.dias ? ' pri' : ''}" data-act="lo-dias" data-n="${n}" aria-pressed="${n === L.dias}">${n} dias</button>`).join('')}</div>
        <button type="button" class="btn sm" data-act="lo-atualiza">${ico('troca')} Atualizar</button>
        <span class="fine lo-hora">Lido às ${esc(hora)}</span>
      </div>
      </header>
      <div id="lo-den"></div>
      ${L1.length ? `<section class="card lo-leitura" aria-labelledby="lo-l"><h2 class="ch" id="lo-l">O que os números dizem</h2><ul>${L1.map(([i, t]) => `<li>${ico(i)}<span>${esc(t)}</span></li>`).join('')}</ul></section>` : ''}
      <section class="lo-pulso" aria-label="O pulso">
        <div class="lo-hero"><span class="lo-tile-r">Gente ativa na semana</span><b class="lo-hero-v">${num(g.ativos7)}</b><span class="lo-tile-s">de ${pessoas(g.perfis)} · hoje ${num(g.ativos_hoje)} · no mês ${num(g.ativos30)}</span></div>
        <div class="lo-tiles">
          ${tile('Perfis', num(g.perfis), `${delta >= 0 ? '▲' : '▼'} ${num(g.novos7)} essa semana (antes, ${num(g.novos7_antes)})`)}
          ${tile(`Entraram em ${per}`, num(g.novos), `${num(g.ativos_periodo)} ativos no período`)}
          ${tile('Voltaram', voltou, Number(g.voltaram_base) ? `${num(g.voltaram)} de ${num(g.voltaram_base)} com mais de 7 dias de casa` : 'falta gente com mais de 7 dias')}
          ${g.sem_perfil !== null && g.sem_perfil !== undefined ? tile('Pararam no cadastro', num(g.sem_perfil), 'entraram com o Google e não criaram o perfil', Number(g.sem_perfil) ? 'alerta' : '') : ''}
        </div>
      </section>
      ${dias.length ? `<section class="card lo-dias" aria-labelledby="lo-d"><h2 class="ch" id="lo-d">Dia a dia <small>(${per})</small></h2>
        <div class="lo-dois">${colunas(dias, 'ativos', 'Gente ativa', 'var(--pink)', hoje)}${colunas(dias, 'novos', 'Gente que entrou', 'var(--blue)', hoje)}</div>
        <details class="lo-tab"><summary>Ver em tabela</summary><table><thead><tr><th scope="col">Dia</th><th scope="col">Ativos</th><th scope="col">Entraram</th></tr></thead>
          <tbody>${dias.slice().reverse().map(x => `<tr><th scope="row">${ddmm(x.dia)}</th><td class="num">${num(x.ativos)}</td><td class="num">${num(x.novos)}</td></tr>`).join('')}</tbody></table></details>
      </section>` : ''}
      <div class="lo-grade">
        ${passos.length ? `<section class="card" aria-labelledby="lo-f"><h2 class="ch" id="lo-f">O caminho de quem chega</h2>
          <p class="fine">Os Primeiros passos, somados: quantas pessoas já fizeram cada um (o % é de quem criou o perfil).</p>${barras(passos, 'var(--blue)', 'funil')}</section>` : ''}
        ${usoT.length ? `<section class="card" aria-labelledby="lo-u"><h2 class="ch" id="lo-u">O que a galera usa <small>(${per})</small></h2>
          <p class="fine">Quantas pessoas usaram cada coisa no período. Contagem de gente, nunca de valor.</p>${barras(uso, 'var(--pink)')}
          ${ninguem.length ? `<p class="fine lo-ninguem"><b>Ninguém ainda:</b> ${esc(ninguem.join(', ').toLowerCase())}.</p>` : ''}</section>` : ''}
        ${bio ? `<section class="card" aria-labelledby="lo-b"><h2 class="ch" id="lo-b">Link na bio <small>(${per})</small></h2>
          <div class="lo-tiles dois">${tile('Visitas', num(bio.visitas))}${tile('Toques nos botões', num(bio.toques))}</div>
          ${bio.top && bio.top.length ? `<h3 class="lo-h3">As páginas mais vistas</h3>${gente(bio.top)}` : '<p class="fine">Nenhuma visita no período ainda.</p>'}</section>` : ''}
        ${lembraHTML(L.lm, g, per)}
        ${cv ? `<section class="card" aria-labelledby="lo-c"><h2 class="ch" id="lo-c">Convites</h2>
          <div class="lo-tiles dois">${tile('Entraram por convite', num(cv.total), `${num(cv.periodo)} em ${per}`)}${tile('Renderam correal', num(cv.pagos))}</div>
          ${cv.top && cv.top.length ? `<h3 class="lo-h3">Quem mais chamou</h3>${gente(cv.top)}` : '<p class="fine">Ninguém entrou por convite ainda.</p>'}</section>` : ''}
        ${pl ? `<section class="card" aria-labelledby="lo-p"><h2 class="ch" id="lo-p">Planos</h2>
          <div class="lo-tiles">${tile('Receita do mês', C.money(Number(pl.mrr) || 0), 'planos pagos com a fatura em dia', 'grana')}
            ${tile('Studio', num(pl.studio), 'pagando')}${tile('Studio Houzi', num(pl.houzi), 'pagando')}${tile('Hórus', num(pl.horus), 'pagando')}
            ${tile('No teste grátis', num(pl.teste))}${tile('Fatura atrasada', num(pl.atrasados), Number(pl.atrasados) ? 'tá no Planos de cada um' : '', Number(pl.atrasados) ? 'alerta' : '')}</div>
          <p class="fine">${Number(pl.pendentes) ? `${pessoas(pl.pendentes)} assinou e não pagou a primeira. ` : ''}${Number(pl.cancelados) ? `${num(pl.cancelados)} cancelaram em ${per}. ` : ''}${pl.donos !== undefined ? `Donos (liberados sem pagar): ${num(pl.donos)}.` : ''}</p></section>` : ''}
        ${ia ? `<section class="card" aria-labelledby="lo-i"><h2 class="ch" id="lo-i">IA <small>(${per})</small></h2>
          <p class="fine">É o que custa: ${num(ia.total)} ${Number(ia.total) === 1 ? 'chamada' : 'chamadas'} de ${pessoas(ia.pessoas)} (você conta aqui).</p>
          ${iaL.length ? barras(iaL, 'var(--ink-2)') : '<p class="fine">Nenhuma no período.</p>'}</section>` : ''}
      </div>
      ${(r.chegaram || []).length ? `<section class="card lo-chegou" aria-labelledby="lo-n"><h2 class="ch" id="lo-n">Quem chegou por último</h2>
        <p class="fine">Pra dar as boas-vindas na mão (quem pôs o WhatsApp no perfil ganha o botão, com a mensagem pronta). Os passos são foto, o que vende, WhatsApp, link na bio e Correverso.</p>
        <ul>${r.chegaram.map(p => `<li><a class="lo-n-a" href="#/@${esc(p.handle || '')}">${C.avatar(p, 's')}<span class="lo-n-q"><b>${esc(p.nome || '@' + p.handle)}</b><small>@${esc(p.handle || '')}${p.categoria && C.meuCorre && C.meuCorre.catNome(p.categoria) ? ` · ${esc(C.meuCorre.catNome(p.categoria))}` : ''}</small></span>
          <span class="lo-n-d"><small>entrou ${esc(haQuanto(p.criado))}</small><small>${esc(ultimoTxt(p.ultimo, hoje))}</small></span>
          <span class="lo-n-p" role="img" aria-label="${num(p.passos)} de 5 passos">${[0, 1, 2, 3, 4].map(i => `<i${i < (Number(p.passos) || 0) ? ' class="on"' : ''}></i>`).join('')}<small class="num">${num(p.passos)}/5</small></span></a>${boasVindas(p)}</li>`).join('')}</ul></section>` : ''}
      <p class="fine lo-pe">Ativo = fez alguma coisa no dia (post, mensagem, curtida, lead, venda, tarefa na cidade...), entrou com o Google ou abriu o Corre (esse último conta da 4.02 em diante). O dia é o de Brasília.</p>
      <div class="lo-tip" id="lo-tip" role="tooltip" hidden></div>
    </main>`;
    ouveTip();
    /* v4.31: as denúncias, em cima de tudo (a Google pede que a gente olhe o que chega) */
    if(C.denuncia) C.denuncia.lojinha($('lo-den'));
  }

  /* o balãozinho das colunas: segue o dedo/mouse e o foco do teclado (o número também tá na tabela) */
  function ouveTip(){
    const tip = $('lo-tip'); if(!tip) return;
    const mostra = (el, x, y) => { tip.textContent = el.dataset.tip || ''; tip.hidden = false; const w = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px'; tip.style.top = Math.max(8, y - 44) + 'px'; };
    document.querySelectorAll('.lo-col').forEach(el => {
      el.addEventListener('pointermove', e => mostra(el, e.clientX, e.clientY));
      el.addEventListener('pointerleave', () => { tip.hidden = true; });
      el.addEventListener('focus', () => { const b = el.getBoundingClientRect(); mostra(el, b.left + b.width / 2, b.top); });
      el.addEventListener('blur', () => { tip.hidden = true; });
    });
  }

  async function carrega(app){
    const rota = C.rota;
    if(L.r) document.querySelector('.lo') && document.querySelector('.lo').classList.add('lendo');
    const semFn = e => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || ''));
    try{
      const [r, lm] = await Promise.all([api.rpc('corre_lojinha', { p_dias: L.dias }),
        api.rpc('corre_lembretes_numeros', { p_dias: L.dias }).catch(e => semFn(e) ? { falta: true } : null)]);
      L.r = r; L.lm = lm; L.em = Date.now(); L.erro = null;
      /* o WhatsApp de quem chegou (o número que a pessoa deixou público) */
      const ids = ((r && r.chegaram) || []).map(p => p.id).filter(Boolean);
      if(ids.length){ try{ const ps = await api.q('corre_perfis', { select: 'id,whats_publico', in: { id: ids } }); L.wa = {}; (ps || []).forEach(p => { if(p.whats_publico) L.wa[p.id] = String(p.whats_publico).replace(/\D/g, ''); }); }catch(e){ L.wa = {}; } }
    }
    catch(e){ L.erro = e; }
    if(rota !== C.rota) return;
    if(L.erro || !L.r){
      const e = L.erro || {}, so = e.code === '42501' || e.hint === 'so_fundador', falta = e.code === 'PGRST202' || e.code === '42883' || /Could not find the function|does not exist/i.test(e.message || '');
      app.innerHTML = C.header('lojinha') + `<main class="wrap lo"><section class="card"><h1 class="ch">Lojinha</h1>
        <p>${so ? 'A Lojinha é só do dono do Corre.' : falta ? 'A Lojinha liga quando o delta-v402.sql rodar no banco.' : esc(C.errMsg ? C.errMsg(e, 'Não deu pra ler os números agora.') : 'Não deu pra ler os números agora.')}</p>
        ${so ? '' : `<div class="acts"><button type="button" class="btn" data-act="lo-atualiza">${ico('troca')} Tentar de novo</button></div>`}</section></main>`;
      return;
    }
    pinta(app);
  }

  C.views.lojinha = async app => {
    document.title = 'Lojinha · Corre';
    /* v4.04: os donos (o Jey e o Lucas também); pelo endereço, espera o acesso chegar antes de dizer que não */
    if(!C.ehDono() && !C.acesso && C.acessoCarrega){ const rota = C.rota; await C.acessoCarrega(); if(rota !== C.rota) return; }
    if(!C.ehDono()){ app.innerHTML =C.header('lojinha') + `<main class="wrap lo"><section class="card"><h1 class="ch">Lojinha</h1><p>A Lojinha é só do dono do Corre.</p></section></main>`; return; }
    if(!L.r) app.innerHTML = C.header('lojinha') + `<main class="wrap lo"><section class="card"><p>Contando a lojinha…</p></section></main>`;
    else pinta(app);
    await carrega(app);
  };
  Object.assign(C.acts, {
    'lo-dias': el => { const n = Number(el.dataset.n); if(!PERIODOS.includes(n) || n === L.dias) return; L.dias = n; try{ localStorage.setItem('corre-lojinha-dias', String(n)); }catch(e){} carrega($('app')); },
    'lo-atualiza': () => carrega($('app'))
  });
})();
