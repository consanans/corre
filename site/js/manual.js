/* CORRE · MANUAL
   O manual do app: a lógica do Corre e o que cada aba faz pra facilitar a correria.
   Abre sozinho na primeira entrada e de novo a cada atualização (com as novidades na frente).
   Fica guardado no canto do teu perfil e no menu da conta. */
(function(){
  'use strict';
  const C = window.Corre, { esc, ico } = C;
  /* sobe esse número a cada atualização: quem já viu recebe de novo, abrindo nas novidades */
  const VERSAO = '3.84';
  const K = 'corre-manual-visto';

  /* O que tem de novo: só o que é super relevante pra galera (o Thales, v3.67). No máximo 8, o mais novo em cima, uma ou
     duas frases cada, no jeito de quem conta pro amigo. Conserto, acabamento e detalhe técnico não entram aqui (moram no
     CLAUDE.md); novidade grande que chega empurra a mais velha pra fora */
  const NOVIDADES = [
    ['magia', 'Direção criativa no Studio Houzi', 'O Studio pensa 6 conceitos de marca inteiros: o nome com as camadas dele, a ideia que manda em tudo, a assinatura, o inimigo e 9 cores com nome e história, cada um já com o logo. Marca o que te pegou e pede mais 6: a rodada seguinte continua daí, sem repetir.'],
    ['mapa', 'A cidade no mapa de Londrina', 'O Correverso foi pro lugar de verdade: o Estádio do Café no norte, o Zerão do lado do Igapó, o lago descendo até o Arthur Thomas, a Gleba do outro lado e o Aeroporto lá em cima. As casas mudaram de quarteirão; no Mapa, "Tua casa" leva direto.'],
    ['verso', 'Parque Arthur Thomas', 'A mata do Arthur Thomas chegou na cidade, do lado do Igapó: trilhas, o lago, a Usina de 1939, o Salto Beija-Flor e as placas que contam a história. Os macacos-prego pulam de galho em galho (não leva comida, que eles pegam), e na Jaula dos Macacos tem o jogo Elo Perdido.'],
    ['troca', 'Armário da casa', 'Na tua casa, para na frente do guarda-roupa: ele abre o teu avatar ali mesmo e você troca de skin (as do Ateliê também) sem sair pra rua.'],
    ['carro', 'Corrida com ronco e trilha', 'No kart e no Autódromo do Café (de moto ou de carro), o motor ronca e troca de marcha, o pneu canta na derrapagem e cada turbo, salto e batida faz barulho. Da contagem até a chegada toca "Pé na Tábua", a trilha de adrenalina feita aqui no Corre.'],
    ['chat', 'Calçadão em 3D', 'Entra pelo Calçadão da cidade: a pedra portuguesa preta e branca, as luminárias de araucária, o Relojão marcando a hora de verdade e a Catedral no fundo da praça. Senta num banco que o povo puxa assunto.'],
    ['gente', 'Cidade mais viva', 'Os moradores do Correverso andam, sentam e puxam papo quando você para perto (o botão amarelo pede mais uma). E o Zerão ganhou pista de skate: rampa, bowl, corrimão, manobra no ar e combo.'],
    ['peixe', 'Rio Tibagi', 'O Tibagi corre embaixo da cidade inteira. No Porto ou na Prainha você pega um barquinho e sai pescando piapara: espera a boia afundar, puxa na hora e segura a briga sem arrebentar a linha.'],
  ];
  /* cada página: o que é, pra que serve no teu dia, e o botão que leva lá */
  const PAGINAS = [
    { k: 'novidades', ico: 'star', t: 'O que tem de novo', sub: `Corre ${VERSAO}`, novidades: true },
    { k: 'logica', ico: 'raio', t: 'A lógica do Corre', sub: 'Tua vitrine, tua mesa de trabalho e tua rede, no mesmo lugar.', ciclo: true,
      itens: ['O teu perfil é a vitrine: o que você faz, o catálogo com preço e as marcas que você toca.', 'Gente te acha pelo Mural, pelo feed, pelo Correverso e pelo teu link.', 'Quem chega vira cliente no Hórus, recebe orçamento e fecha em Vendas.', 'O dinheiro cai na Grana. O Studio volta a alimentar a vitrine com post novo.', 'O que é teu (grana, clientes, vendas) só você vê. O que vai pra vitrine, você escolhe.'] },
    { k: 'inicio', ico: 'home', t: 'Início', sub: 'O teu dia num lugar: feed, stories e o resumo do corre.', h: '#/', ir: 'Abrir o Início',
      itens: ['Posta até 500 letras (ou um fio), com foto ou enquete. Fortalece, cita, responde, salva pra depois e fixa o teu melhor no perfil.', 'Pra você mostra o que tá rendendo perto do teu corre; Seguindo é só quem você segue.', 'Stories de quem você segue, em alta no Corre e quem seguir do teu nicho.', 'Os cards do lado: corre do mês, visitas marcadas, vendas a receber, a Banca do dia e o Do teu nicho.', 'No topo, os atalhos das tuas ferramentas, na ordem do menu: Studio, Studio Houzi, Vendas e Grana, Banca do dia, Do teu nicho, Rolo 360 e Hórus (se ligado).'] },
    { k: 'studio', ico: 'magia', t: 'Studio', sub: 'Programa o mês das tuas marcas. O Corre posta. Fica no Laboratório, no menu.', h: '#/studio', ir: 'Entrar no Studio',
      itens: ['O calendário (mês, semana e lista) mostra cada post na cor da marca: programado, publicado, atrasado ou rascunho, com a miniatura da arte.', 'Mês com IA: quantos posts, os dias e a hora. A IA monta a pauta (você mexe no que quiser), desenha as artes com as referências da marca e escreve as legendas. Tudo entra programado.', 'Subir artes: as artes que você já tem entram na agenda na ordem; a IA escreve as legendas olhando cada uma.', 'Postar em: cada post diz em qual conta do Instagram sai. Conecta as contas com o login de cada uma (no próprio Instagram); o post sai sozinho, no dia e na hora, na conta escolhida. Sem conta, vira lembrete: na hora, toca em Postar, a legenda vai copiada e a arte vai pro Instagram (no celular, pelo compartilhar).', 'Acabou o grátis de IA do dia? Dá pra continuar com correal, a moeda do Correverso.'] },
    { k: 'horus', ico: 'eye', t: 'Hórus', sub: 'Teu radar de clientes. Liga e desliga no perfil, em Ferramentas.', h: '#/horus', ir: 'Abrir o Hórus',
      itens: ['Acha empresa por região e nicho e guarda como lead.', 'Ficha de cada um: histórico, WhatsApp, próximo passo e fotos de referência.', 'Marca visita (entra na Agenda dos Avisos e no Início) e manda orçamento pelo link.', 'Pedido que chega pelo teu perfil ou pelo Mural já cai aqui.'] },
    { k: 'mural', ico: 'tacha', t: 'Mural', sub: 'Onde quem precisa encontra quem faz.', h: '#/mural', ir: 'Abrir o Mural',
      itens: ['Pergunta aberta: alguém pergunta "quem faz X em Y?" e a IA indica gente do Corre.', 'Liga "Aparecer no Mural" no teu perfil pra ser indicado.', 'Pedidos fixados: manda proposta, e quando te escolhem vira lead no Hórus.'] },
    { k: 'grupos', ico: 'gente', t: 'Grupos', sub: 'Gente do mesmo corre num lugar só. Tema livre.', h: '#/grupos', ir: 'Ver os grupos',
      itens: ['Qualquer um cria, do assunto que quiser: nome, descrição, regras, tags, cor e capa.', 'Aberto: entra direto e todo mundo vê os posts. Fechado: pede pra entrar (com um recado), o dono ou um moderador aceita, e só quem tá dentro vê.', 'Dentro tem o mural do grupo (post, enquete, resposta e um post fixado) e o papo ao vivo, que fica nas tuas Mensagens.', 'Post do grupo fica no grupo: não vai pro Início de ninguém. No teu perfil aparece com o selo do grupo, pra quem pode ver o grupo.', 'O dono nomeia moderadores. Quem modera aceita pedido, fixa post, apaga post e resposta, tira e bane.', 'Teus grupos ficam na faixa do Início; os grupos de cada um aparecem no perfil. Chamar gente copia o link do grupo.'] },
    { k: 'houzi', ico: 'houzi', t: 'Studio Houzi', sub: 'Marca com conceito: do naming ao brandbook, feita no teu aparelho. Fica no Laboratório, no menu.', h: '#/houzi', ir: 'Abrir o Studio Houzi',
      itens: ['Três portas: "Ainda não" (do nome ao brandbook), "Tenho o nome" (falta a marca) e "Tenho, e quero outra" (rebranding).', 'Naming: nomes por estratégia (descritivo, evocativo, inventado, de origem, gíria, composto, metáfora), cada um com o porquê, o @ e o domínio pra conferir. Marca os favoritos ou usa o teu.', 'As referências: o clima em palavras, o que não pode parecer, as cores que você ama e as que não quer, o peso da letra, onde a marca vive e até 6 imagens (lidas no teu aparelho). O Studio mostra o que entendeu e puxa os caminhos pra perto disso.', 'Seis amostras, todas coerentes com o negócio e com o sentido do nome. "Mais 6 caminhos" sempre traz caminho novo (nunca repete o que já apareceu); Ver de perto mostra as versões e o porquê; Escolher leva pra bancada.', 'Direção criativa: 6 conceitos inteiros pensados pela IA (o nome e as camadas dele, a ideia central, a assinatura, o inimigo, a paleta de 9 cores com nome e história e a abertura do brandbook), desenhados pelo Studio. "Puxa pra cá", "Não é isso" e o que mudar: o "Mais 6, seguindo daqui" continua a conversa; "Seguir por essa" abre 6 a partir de uma. Sem nome? A direção acha 6. Escolheu, ela escreve a plataforma, o manifesto, a voz e os nomes dos produtos.', 'Bancada: ideia, símbolo, letra, cores (com receitas e teste de contraste), textos e dados. Salva sozinho.', 'Brandbook: abre com o filme da marca e passa por conceito, naming, logo, construção (com as medidas), tipografia, cores (com as combinações que funcionam), elementos, som e movimento, voz, na prática e aplicações, cada parte com o texto do conceito. Publica pra mandar o link; rascunho só você vê.', 'Som e movimento: a assinatura sonora sai do nome (as vogais dão a melodia) e da cor (o tom), e o logo animado usa a mesma música. Na prática, escreve a frase e sai o post, o story ou o quadrado com a cara da marca. Apresentar mostra tudo em slides.', 'Baixa o brandbook em PDF e o kit (logos em SVG, PNG e PDF, favicon, avatar e capa, paleta pra Photoshop/Illustrator, as letras com licença, o som em WAV, os vídeos, modelos de post, capas de destaque, cartão de visita, papel timbrado e o QR). Baixar é só pro dono da marca; quem visita vê e ouve.', 'No rebranding, a imagem do logo de hoje é lida no teu aparelho e não sobe pra lugar nenhum.'] },
    { k: 'verso', ico: 'verso', t: 'Correverso', sub: 'A cidade do Corre, em pixel, com voz.', h: '#/verso', ir: 'Entrar na cidade',
      itens: ['Monta a tua skin de blocos (a mesma em todo aparelho) e sai pela porta da tua casa. Bate na tua porta e entra: a casa por dentro é em 3D, com o escritório (as tuas ferramentas), a loja de móveis, o Decorar e o guarda-roupa, onde você troca de skin. Quem bate na tua porta pode visitar, e a conversa de quem tá na mesma casa fica só entre eles. Cada perfil tem um quarteirão numa Londrina de pixel: Centro, Lago Igapó, Gleba, Zerão (com pista de skate), Bosque, Estádio e, embaixo de tudo, o Rio Tibagi, onde se pesca piapara de barquinho. Do lado do Igapó, o Parque Arthur Thomas: a mata, os macacos-prego e o jogo Elo Perdido na Jaula dos Macacos. Os moradores puxam papo quando você para perto deles, e no meio do Calçadão tem a porta do Calçadão em 3D, cheio de gente sentada conversando. O botão Mapa leva direto pra qualquer lugar.', 'No Trampo, escolhe o uniforme (o boneco troca na hora) e pega tarefa: são 3 por uniforme, e a que você pegou vai pro fim da fila. Cada ponto vale 3 centavos de correal (umas 10 tarefas fecham o dia em 1,00, o teto), a moeda que paga a IA do Corre quando acaba o grátis. A carteira fica no alto da cidade.', 'Senta num banco (ou nos degraus da Concha) e usa o Falar pra puxar assunto com quem tá perto.', 'A casa cresce com o que você faz: posts, seguidores, catálogo e escolhas no Mural. Dinheiro não conta.', 'Bate na porta de alguém pra ver o perfil. Na praça tem o Mural e a Banca; logo abaixo, a Feira do Corre: uma barraca pra cada ferramenta, que abre num balcão por cima da cidade.', 'Liga o mic: chegou perto de quem tá de mic ligado, a conversa abre. Dá pra silenciar e bloquear.', 'No celular: direcional embaixo à esquerda, Pular à direita e o botão de ação acima dele. No computador: setas ou W A S D, espaço pula, E ou Enter faz a ação, B buzina.', 'Garagem: skate, patinete, bike, scooter, moto ou carro, na cor que quiser (todos de graça). No Aeroporto de Londrina, o avião cruza a cidade e te solta de paraquedas onde você quiser, por 0,05 correal.', 'O som: a musiquinha da cidade, os passos, o trânsito e os passarinhos. Nas corridas, o ronco do motor, o pneu, os turbos e a trilha "Pé na Tábua". O botão no alto troca entre música, só sons e mudo.'] },
    { k: 'corre', ico: 'grana', t: 'Corre: Vendas e Grana', sub: 'Do orçamento ao dinheiro na conta, numa página só. Só você vê. Fica no Financeiro, no menu.', h: '#/corre', ir: 'Abrir o Corre',
      itens: ['Vendas: monta o orçamento pelo catálogo, manda com link, o cliente aprova e vira "a receber".', 'Sinal, vencimento e a cobrança pronta pro WhatsApp. Recebeu, toca em Recebi.', 'Grana: contas, extrato (OFX), o que entrou e saiu, quanto custa teu estilo de vida e a meta do mês.', 'O olho lá em cima esconde todos os valores da tela.', 'Do lado, no Financeiro, fica a carteira de correal. Correal não é dinheiro: é a moeda do Correverso e paga a IA quando acaba o grátis do dia.'] },
    { k: 'rolo', ico: 'toldo', t: 'Banca', sub: 'Banca do dia, Do teu nicho e Rolo 360. No menu, em Banca.', h: '#/banca', ir: 'Abrir a Banca',
      itens: ['Do teu nicho: datas que vendem, preço de mercado e mensagem pronta pros teus clientes.', 'Banca do dia: as notícias do teu assunto e das tuas marcas.', 'Rolo 360: a sala de projeção, com 5 lugares do mundo por dia, no escuro e com música clássica.'] },
    { k: 'perfil', ico: 'eu', t: 'Perfil, Meu corre e Portfólio', sub: 'O que o mundo vê de você.', h: '#/editar', ir: 'Editar meu perfil',
      itens: ['Meu corre: categoria, o que você faz, catálogo com preço, orçamento online e WhatsApp público.', 'Na vitrine ou desbaratinado: desbaratinado, teus posts e dados ficam só pra quem te segue.', 'Portfólio: as marcas que você toca. Com o @ do Insta, a marca ganha Studio e painel.', 'Recomendações: cliente, parceiro ou colega te recomenda e você escolhe o que aparece. Aberto pra trampo põe o anel no teu avatar.', 'Teu corre (só você vê): a carteira de correal, Vendas e Grana, Studio, Studio Houzi, Hórus, Portfólio e o Rolo 360.', 'Este manual fica no canto do teu perfil.'] },
    { k: 'dia', ico: 'clock', t: 'Um dia de corre', sub: 'Um jeito de usar tudo junto.', dia: true,
      itens: [['Manhã', 'Banca do dia pra saber do assunto. No Studio, o Mês com IA programa o mês das marcas de uma vez.'], ['Tarde', 'Hórus: responde quem chegou, marca visita. Vendas: manda o orçamento.'], ['Noite', 'Recebeu? Toca em Recebi. A Grana fecha o dia sozinha.'], ['Sempre', 'Posta no feed, liga o Aparecer no Mural e passa no Correverso: trocar ideia e fazer tarefa, que vira correal.']] }
  ];

  let atual = 0, auto = false;
  function pagina(i){
    const p = PAGINAS[i];
    if(p.novidades) return `<div class="man-pg"><div class="man-h"><span class="man-ico">${ico(p.ico)}</span><div><h3>${esc(p.t)}</h3><p>${esc(p.sub)}</p></div></div>
      <ul class="man-nov">${NOVIDADES.map(([ic, t, d]) => `<li><span class="man-ico sm">${ico(ic)}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join('')}</ul></div>`;
    const ciclo = p.ciclo ? `<ol class="man-ciclo" aria-label="O ciclo do Corre">${[['eu', 'Vitrine'], ['tacha', 'Te acham'], ['eye', 'Cliente'], ['recibo', 'Venda'], ['grana', 'Grana'], ['magia', 'Post novo']].map(([ic, t]) => `<li><span>${ico(ic)}</span><b>${t}</b></li>`).join('')}</ol>` : '';
    const lista = p.dia ? `<ul class="man-dia">${p.itens.map(([h, t]) => `<li><b>${esc(h)}</b><span>${esc(t)}</span></li>`).join('')}</ul>` : `<ul class="man-it">${p.itens.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    return `<div class="man-pg"><div class="man-h"><span class="man-ico">${ico(p.ico)}</span><div><h3>${esc(p.t)}</h3><p>${esc(p.sub)}</p></div></div>${ciclo}${lista}
      ${p.h ? `<div class="acts"><button type="button" class="btn" data-act="manual-ir" data-h="${esc(p.h)}">${esc(p.ir)} ${ico('next')}</button></div>` : ''}</div>`;
  }
  function pinta(){
    const c = C.$('man-corpo'); if(!c) return;
    c.innerHTML = pagina(atual); c.scrollTop = 0;
    document.querySelectorAll('.man-nav [data-i]').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.i) === atual)));
    const ult = atual === PAGINAS.length - 1;
    C.$('man-pos').textContent = `${atual + 1} de ${PAGINAS.length}`;
    C.$('man-ant').disabled = atual === 0;
    C.$('man-prox').innerHTML = ult ? `Bora pro corre ${ico('raio')}` : `Próximo ${ico('next')}`;
    const ativo = document.querySelector('.man-nav [aria-current="true"]'); if(ativo && ativo.scrollIntoView) ativo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function abrir(k, sozinho){
    const i = PAGINAS.findIndex(p => p.k === k); atual = i >= 0 ? i : 1; auto = !!sozinho;
    /* só conta como visto quem já tá dentro (no login ele abre como apresentação) */
    if(C.st && C.st.me) try{ localStorage.setItem(K, VERSAO); }catch(e){}
    C.sheet(`<div class="form man"><div class="sheet-head"><h2>${auto ? (PAGINAS[atual].k === 'novidades' ? 'O Corre atualizou' : 'Bem-vindo ao Corre') : 'Manual do Corre'}</h2><button type="button" class="cbtn plain" data-close aria-label="Fechar">${ico('x')}</button></div>
      ${auto ? `<p class="man-intro">${PAGINAS[atual].k === 'novidades' ? 'Tem coisa nova. Passa pelas novidades e, se quiser, revê o manual inteiro aqui do lado.' : 'Um minuto pra entender o app e fazer ele trabalhar pra você.'} Fica guardado no canto do teu perfil.</p>` : ''}
      <div class="man-cols"><nav class="man-nav" aria-label="Partes do manual">${PAGINAS.map((p, n) => `<button type="button" data-act="manual-pg" data-i="${n}">${ico(p.ico)}<span>${esc(p.t)}</span></button>`).join('')}</nav>
        <div class="man-corpo" id="man-corpo" aria-live="polite"></div></div>
      <div class="acts man-pe"><button type="button" class="btn ghost" id="man-ant" data-act="manual-ant">Anterior</button><span class="man-pos mono" id="man-pos"></span><button type="button" class="btn pri" id="man-prox" data-act="manual-prox"></button></div></div>`, 'wide');
    pinta();
  }
  /* abre sozinho uma vez por versão, quando a pessoa já tá dentro (e não tem outra folha aberta) */
  let feito = false;
  function talvez(tent){
    if(feito || /[?&]nomanual\b/.test(location.search)) return;
    let visto = null; try{ visto = localStorage.getItem(K) || ''; }catch(e){ return; }
    if(visto === VERSAO){ feito = true; return; }
    const sh = C.$('sheet'); if(sh && !sh.hidden){ if((tent || 0) < 30) setTimeout(() => talvez((tent || 0) + 1), 2500); return; }
    feito = true; abrir(visto ? 'novidades' : 'logica', true);
  }
  Object.assign(C.acts, {
    manual: el => abrir((el && el.dataset && el.dataset.p) || 'logica'),
    'manual-pg': el => { atual = Number(el.dataset.i) || 0; pinta(); },
    'manual-ant': () => { if(atual > 0){ atual--; pinta(); } },
    'manual-prox': () => { if(atual < PAGINAS.length - 1){ atual++; pinta(); } else C.closeSheet(); },
    'manual-ir': el => { C.closeSheet(); C.go(el.dataset.h); }
  });
  C.manual = { abrir, talvez, VERSAO };
})();
