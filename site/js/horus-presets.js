/* HÓRUS · presets: nichos com a "pergunta que dói" (hook), o valor e o gancho de uma linha, e as mensagens da cadência.
   "padrao" serve pra agência e pra quem vende serviço criativo, em qualquer cidade do Brasil; "kivotrack" é o do Thales. */
window.CORRE_HORUS_PRESETS = {
"padrao": {
"nome": "Agência, social media e criativos (Brasil todo)",
"oferta": "social media",
"link": "",
"nichos": [
{
"k": "comida",
"n": "Restaurantes e lanches",
"prio": "hot",
"re": "restaurante|lanchonete|hamburgu|burger|pizz|sushi|japon|churrasc|espetinho|marmit|food|lanches|a[cç]a[ií]",
"hook": "Quando alguém da cidade procura onde comer hoje, a {empresa} aparece no feed ou passa batido?",
"valor": "Eu cuido do Instagram com foto que dá fome, Reels toda semana e post que vira pedido.",
"gancho": "Instagram que dá fome e vira pedido"
},
{
"k": "cafe",
"n": "Cafés e padarias",
"prio": "hot",
"re": "caf[eé]|cafeteria|padaria|confeitaria|doceria|bolo",
"hook": "O café de vocês é bom de verdade. O Instagram tá contando isso pra quem ainda não entrou aí?",
"valor": "Faço o conteúdo do dia a dia: o balcão, o forno, a primeira fornada, com cara de lugar que a gente quer ir.",
"gancho": "o dia a dia do café virando motivo pra pessoa ir até aí"
},
{
"k": "saude",
"n": "Odonto e consultórios",
"prio": "hot",
"re": "odonto|dentist|ortodon|implante|consult[oó]rio|cl[ií]nica m[eé]dica|pediatr|cardiolog|oftalmo|fonoaud|ortoped",
"hook": "Quem procura dentista ou médico em {cidade} hoje decide pelo Instagram e pelo Google. A {empresa} passa confiança antes da primeira consulta?",
"valor": "Cuido do Instagram e do perfil no Google com conteúdo que explica, mostra a equipe e respeita as regras do conselho.",
"gancho": "paciente que chega pelo Instagram já confiando"
},
{
"k": "estetica",
"n": "Estética e saúde",
"prio": "hot",
"re": "est[eé]tica|cl[ií]nica|dermato|harmoniza|fisioterap|nutri|psic[oó]log|spa",
"hook": "Hoje quem chega na {empresa} pelo Instagram já chega confiando, ou ainda precisa ser convencido no WhatsApp?",
"valor": "Monto um Instagram que mostra resultado, bastidor e gente de verdade, do jeito que o conselho permite.",
"gancho": "Instagram que faz o paciente chegar confiando"
},
{
"k": "academia",
"n": "Academias e estúdios",
"prio": "warm",
"re": "academia|crossfit|pilates|studio|est[uú]dio|funcional|lutas?|jiu|muay|yoga|dan[cç]a",
"hook": "Janeiro todo mundo matricula. Como a {empresa} segura o aluno de março pra frente?",
"valor": "Faço conteúdo que dá vontade de treinar: aluno real, treino do dia e desafio que movimenta a turma.",
"gancho": "conteúdo que matricula e segura aluno"
},
{
"k": "moda",
"n": "Moda e lojas",
"prio": "warm",
"re": "moda|boutique|roupa|loja|cal[cç]ados|t[eê]nis|sneaker|streetwear|acess[oó]rio|[oó]tica|joia",
"hook": "Peça nova chegando toda semana e o feed mostrando a mesma foto de cabide?",
"valor": "Produzo foto e vídeo de peça no corpo, com styling e Reels de lançamento que esgota grade.",
"gancho": "lançamento que esgota grade"
},
{
"k": "beleza",
"n": "Salões e barbearias",
"prio": "warm",
"re": "sal[aã]o|cabeleire|barbearia|barber|manicure|unha|sobrancelha|c[ií]lios|maquiagem",
"hook": "A agenda da {empresa} enche pelo Instagram ou ainda depende de indicação?",
"valor": "Faço o antes e depois que para o dedo, e deixo o agendamento a um clique.",
"gancho": "antes e depois que enche a agenda"
},
{
"k": "imovel",
"n": "Imobiliárias e construtoras",
"prio": "warm",
"re": "imobili[aá]ri|im[oó]ve|construtora|incorporadora|corretor|arquitet|decora",
"hook": "Os imóveis de vocês aparecem em vídeo ou só em foto de anúncio igual a de todo mundo?",
"valor": "Faço tour em vídeo, Reels de bairro e conteúdo que faz a pessoa se ver morando ali.",
"gancho": "imóvel em vídeo que faz a pessoa se ver morando"
},
{
"k": "pet",
"n": "Pet",
"prio": "warm",
"re": "pet|veterin|banho e tosa|ra[cç][aã]o|agropet",
"hook": "Bicho fofo é o conteúdo que mais roda no Instagram. A {empresa} tá aproveitando isso?",
"valor": "Transformo o movimento da loja em conteúdo: cliente de quatro patas, dica de cuidado e promoção que circula.",
"gancho": "o cliente de quatro patas virando conteúdo que roda"
},
{
"k": "eventos",
"n": "Bares e eventos",
"prio": "warm",
"re": "bar\\b|pub|choperia|cervej|balada|casa de show|eventos?|buffet|festa",
"hook": "O evento de sábado começa a encher na segunda ou só na sexta à noite?",
"valor": "Faço a agenda virar expectativa: teaser, cobertura no dia e o pós que já vende o próximo.",
"gancho": "agenda que enche antes do dia"
},
{
"k": "educacao",
"n": "Escolas e cursos",
"prio": "cold",
"re": "escola|col[eé]gio|curso|idiomas?|ingl[eê]s|faculdade|educa",
"hook": "A matrícula de vocês vem do Instagram ou o perfil só serve pra recado?",
"valor": "Mostro a escola por dentro: aula, aluno e resultado, do jeito que pai e aluno decidem.",
"gancho": "a escola por dentro, do jeito que a família decide"
},
{
"k": "auto",
"n": "Automotivo",
"prio": "cold",
"re": "oficina|auto ?pe[cç]as|mec[aâ]nic|funilaria|lava ?jato|est[eé]tica automotiva|concession|revenda de carros|seminovos",
"hook": "Carro bom parado no pátio não vende. Como os carros da {empresa} aparecem no Instagram hoje?",
"valor": "Faço vídeo de carro que para o scroll e conteúdo de oficina que passa confiança.",
"gancho": "carro em vídeo que vende antes de chegar no pátio"
},
{
"k": "escritorio",
"n": "Advocacia e contabilidade",
"prio": "warm",
"re": "advoca|advogad|jur[ií]dic|contab|contador|assessoria cont",
"hook": "Quando uma empresa de {cidade} procura advogado ou contador, ela acha a {empresa} ou o concorrente que posta?",
"valor": "Faço conteúdo de autoridade sem juridiquês: as dúvidas reais dos clientes, bastidor e constância, do jeito que o conselho da categoria permite.",
"gancho": "autoridade que vira cliente sem parecer propaganda"
},
{
"k": "hotel",
"n": "Hotéis e pousadas",
"prio": "warm",
"re": "hotel|pousada|hostel|resort|chal[eé]s?|hospedagem",
"hook": "Quem planeja vir pra {cidade} escolhe onde ficar pelo Instagram. A {empresa} aparece nessa hora ou só no site de reserva?",
"valor": "Faço foto e Reels que vendem a experiência e campanha que traz reserva direta, sem comissão de plataforma.",
"gancho": "reserva direta, sem pagar comissão pra plataforma"
},
{
"k": "outros",
"n": "Outros",
"prio": "cold",
"re": "",
"hook": "Quem ainda não conhece a {empresa} entende em 5 segundos de Instagram o que vocês fazem?",
"valor": "Eu cuido disso: posicionamento, conteúdo e frequência, com cara de marca e não de panfleto.",
"gancho": "Instagram com cara de marca, não de panfleto"
}
],
"tpl": {
"abordagem": "{oi} Aqui é {eu}, {oferta} de {minha_cidade}. Tô olhando {nicho} de {cidade} essa semana.\n{sinal}\n\n{hook} {valor}\n\nPosso te mandar uma ideia pensada pra {empresa}? Leva 2 minutos.",
"retomar": "{oi} {eu} de novo. Resumindo numa linha: {gancho}. Te mando a ideia por aqui?",
"mostra": "{oi} Pra você ver como eu trabalho (atendo empresas do Brasil todo, tudo pelo WhatsApp e por vídeo): {link}\n\nSe fizer sentido pra {empresa}, a gente conversa 15 minutos essa semana. Qual dia fica melhor?",
"ultimo": "{oi} Último toque pra não virar chato: se agora não é o momento, tranquilo. Quando quiser, é só me chamar aqui. Valeu! {eu}",
"interesse": "{oi} Que bom que curtiu! Qual o melhor horário pra uma conversa de 15 minutos? Já levo uma proposta pensada pra {empresa}.",
"link": "Fechado! Segue o link pra gente começar: {link}\n\nQualquer coisa, me chama aqui."
}
},
"kivotrack": {
"nome": "KivoTrack (rastreador)",
"oferta": "parceiro do KivoTrack",
"link": "",
"nichos": [
{
"k": "transp",
"n": "Transportadoras",
"prio": "hot",
"hook": "Quando um cliente liga perguntando da carga, vocês respondem na hora ou precisam caçar o motorista?",
"valor": "Com o KivoTrack o cliente acompanha o caminhão ao vivo por um link, e você tem o replay de cada parada.",
"gancho": "o cliente acompanha o caminhão ao vivo por um link e você tem o replay de cada viagem",
"re": "transport|log[ií]stic|cargas?\\b|frota|rodovi[aá]ri"
},
{
"k": "autoescola",
"n": "Autoescolas",
"prio": "hot",
"hook": "Já aconteceu de um carro de aula rodar fora do horário sem você saber?",
"valor": "O KivoTrack trava o carro sozinho fora do expediente e grava o trajeto de cada aula, com horário.",
"gancho": "carro de aula travado fora do horário e o trajeto de cada aula gravado",
"re": "auto ?escola|cfc\\b|habilita[cç]"
},
{
"k": "gas",
"n": "Gás, água e bebidas",
"prio": "hot",
"hook": "Dá pra saber se o entregador foi direto pro cliente ou fez uma corrida por fora no caminho?",
"valor": "O KivoTrack grava o trajeto de cada entrega e, se a moto sumir, você trava pelo celular.",
"gancho": "cada entrega gravada no mapa e a moto travada pelo celular se sumir",
"re": "\\bg[aá]s\\b|[aá]gua mineral|bebidas|distribuidora"
},
{
"k": "obra",
"n": "Caçambas, areia e pedra",
"prio": "hot",
"hook": "Se um caminhão de vocês fizer um frete por fora hoje, você fica sabendo?",
"valor": "O KivoTrack grava cada viagem com endereço e horário, comprova entrega e retirada de caçamba e trava o caminhão fora do expediente.",
"gancho": "cada viagem gravada pra comprovar entrega e retirada, e o caminhão travado fora do expediente",
"re": "ca[cç]amba|areia|pedra|entulho|terraplan|materiais de constru"
},
{
"k": "entrega",
"n": "Motofrete e entregas",
"prio": "hot",
"hook": "Se uma moto de vocês sumir hoje, em quanto tempo você descobre onde ela está?",
"valor": "O KivoTrack te liga se ela for mexida fora de hora, você trava pelo celular e ainda fica com o trajeto de cada entrega.",
"gancho": "o KivoTrack te liga se a moto for mexida e você trava pelo celular",
"re": "motofrete|moto ?boy|entregas?|delivery|courier"
},
{
"k": "escolar",
"n": "Transporte escolar",
"prio": "hot",
"hook": "Quantas vezes por dia algum pai te pergunta onde a van está?",
"valor": "Com o KivoTrack você manda um link e os pais acompanham a van ao vivo. Além do sossego, vira argumento pra fechar mais alunos.",
"gancho": "os pais acompanham a van ao vivo e param de te ligar",
"re": "escolar|transporte de alunos|van escolar"
},
{
"k": "autonomo",
"n": "Caminhoneiros autônomos",
"prio": "hot",
"hook": "Se mexerem no seu caminhão de madrugada, quem te avisa?",
"valor": "O KivoTrack te liga na hora e você trava pelo celular, de onde estiver.",
"gancho": "se mexerem no caminhão você recebe uma ligação na hora e trava pelo celular",
"re": "caminhoneiro|aut[oô]nomo"
},
{
"k": "guincho",
"n": "Guinchos e auto socorro",
"prio": "warm",
"hook": "Quando entra um chamado, você sabe na hora qual guincho está mais perto?",
"valor": "O KivoTrack mostra a frota toda ao vivo num painel e grava cada atendimento com horário, pra comprovar pra seguradora.",
"gancho": "você vê qual guincho está mais perto de cada chamado e comprova o atendimento com horário",
"re": "guincho|reboque|auto socorro|socorro 24"
},
{
"k": "mudanca",
"n": "Mudanças e fretes",
"prio": "warm",
"hook": "Cliente de mudança fica ansioso. E se ele acompanhasse o caminhão ao vivo pelo celular?",
"valor": "O KivoTrack gera esse link em segundos e grava cada viagem, o que também mostra se o caminhão rodou fora do serviço.",
"gancho": "o cliente acompanha a mudança ao vivo e você tem cada viagem gravada",
"re": "mudan[cç]a|frete|carreto"
},
{
"k": "servico",
"n": "Serviços de campo",
"prio": "warm",
"hook": "Vocês conseguem confirmar se a equipe chegou mesmo no cliente, e a que horas?",
"valor": "O KivoTrack grava o trajeto de cada carro com horário e trava o veículo fora do expediente.",
"gancho": "você confirma a hora que a equipe chegou em cada cliente e trava o carro fora do expediente",
"re": "el[eé]tric|hidr[aá]ulic|manuten[cç][aã]o|refrigera|dedetiz|instala[cç][aã]o|t[eé]cnic"
},
{
"k": "locadora",
"n": "Locadoras locais",
"prio": "warm",
"hook": "Quando um carro atrasa a devolução, em quanto tempo vocês acham ele?",
"valor": "Com o KivoTrack você vê o carro ao vivo e trava pelo celular, com a frota toda num painel e fatura única.",
"gancho": "carro que atrasa a devolução você localiza e trava pelo celular",
"re": "locadora|aluguel de (carro|ve[ií]culo)|rent a car"
},
{
"k": "fretamento",
"n": "Fretamento e turismo",
"prio": "warm",
"hook": "Quando o contratante cobra horário, vocês conseguem provar que o ônibus chegou na hora?",
"valor": "O KivoTrack grava cada viagem com horário e gera um link ao vivo pro contratante acompanhar.",
"gancho": "o contratante acompanha a viagem ao vivo e você prova cada horário",
"re": "fretamento|turismo|excurs[aã]o|[ôo]nibus"
},
{
"k": "agro",
"n": "Produtores rurais",
"prio": "warm",
"hook": "Caminhonete e caminhão parados longe da sede: se alguém mexer à noite, quem te avisa?",
"valor": "O KivoTrack te liga na hora e você trava pelo celular. Ele também avisa a manutenção pela quilometragem.",
"gancho": "se mexerem na caminhonete à noite você recebe uma ligação e trava pelo celular",
"re": "fazenda|agro|rural|s[ií]tio|ch[aá]cara|cooperativa"
},
{
"k": "outros",
"n": "Funerárias e institucionais",
"prio": "cold",
"hook": "Na hora de prestar contas do uso dos veículos, vocês têm o trajeto de cada um?",
"valor": "O KivoTrack grava cada rota e mostra a frota inteira num painel só, com fatura única.",
"gancho": "a frota inteira num painel, com o trajeto de cada veículo pronto pra prestar contas",
"re": "funer[aá]ri|institui[cç]|prefeitura|igreja|associa[cç]"
}
],
"tpl": {
"abordagem": "{oi} Aqui é o {eu}, parceiro do KivoTrack em {cidade}.\n{sinal}\n\n{hook} {valor} Instalação inclusa, R$ 39,90 por veículo.\n\nEstou visitando empresas da região essa semana. Posso passar aí 10 minutos?",
"retomar": "{oi} {eu} de novo, do KivoTrack. Resumindo numa linha: {gancho}. Consigo passar aí essa semana, leva 10 minutos. Qual dia fica melhor?",
"mostra": "{oi} {eu} do KivoTrack de novo. Na prática fica assim: {gancho}. No app aparece cada veículo no mapa ao vivo, com o histórico de rota e o travamento pelo celular. Passo aí essa semana e te mostro em 10 minutos?",
"ultimo": "{oi} Último toque pra não virar chato: se rastreamento não é prioridade agora, tranquilo. Quando fizer sentido, é só me chamar aqui que eu passo aí na {empresa}. Valeu! {eu}, KivoTrack.",
"interesse": "{oi} Pra eu já chegar com a conta pronta: quantos veículos vocês têm hoje? Se quem decide puder estar junto, a gente resolve tudo numa conversa só.",
"link": "Perfeito! Segue o link com a minha indicação:\n{link}\n\nSão três passos: cadastro, pagamento no app (cartão ou PIX) e a equipe agenda a instalação com você pelo WhatsApp. Plano anual, R$ 39,90 por veículo, instalação inclusa. Se travar em alguma etapa, me chama que eu resolvo."
}
}
};
