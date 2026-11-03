/* HÓRUS · v5.32 · o catálogo de nichos (o Thales: "adicione mais centenas de nicho no hórus"). Centenas de tipos de
   negócio prontos pra escolher em Ajustar o Hórus › Nichos › Catálogo: cada um com o nome, as palavras que acham ele
   pelo nome no mapa (e que reconhecem o lead que chega), o filtro do OpenStreetMap quando o mapa tem um, e o ramo. A
   pergunta que dói, o valor e o gancho vêm do ramo e falam com o {oferta} de quem vende (a pessoa ajusta depois, ou
   pede pra IA no "Montar com IA"). As palavras vão sem colchete: o mapa procura pelo nome e não entende [eé]. */
(function(){
  'use strict';
  /* os ramos: o nome, e a pergunta, o valor e o gancho que servem pra qualquer coisa que a pessoa venda ({oferta}) */
  const G = {
    comida: ['Comida e bebida', 'Quando o movimento da {empresa} cai no meio da semana, o que vocês fazem pra trazer gente?', 'Trabalho com {oferta} e ajudo quem vive de comida a encher os dias fracos.', 'mais movimento nos dias fracos'],
    beleza: ['Beleza', 'A agenda da {empresa} tá cheia a semana toda ou sobra horário vago?', 'Trabalho com {oferta} pra salão e estúdio de beleza encher a agenda e fazer a cliente voltar.', 'agenda cheia e cliente que volta'],
    saude: ['Saúde', 'Quem procura atendimento em {cidade} acha a {empresa} e confia antes de marcar?', 'Trabalho com {oferta} pra consultório e clínica passar confiança e lotar a agenda, dentro das regras do conselho.', 'paciente que chega já confiando'],
    fitness: ['Esporte e bem-estar', 'Quantos alunos a {empresa} perde por mês, e quantos novos entram?', 'Trabalho com {oferta} pra academia e estúdio trazer aluno novo e segurar quem já treina.', 'aluno novo e aluno que fica'],
    educacao: ['Educação e cursos', 'Quando chega a época de matrícula, a {empresa} já tá na cabeça dos pais e dos alunos?', 'Trabalho com {oferta} pra escola e curso encher turma e lotar a matrícula.', 'turma cheia na matrícula'],
    moda: ['Moda e acessórios', 'A coleção nova da {empresa} chega em quem compra ou fica parada na arara?', 'Trabalho com {oferta} pra loja de moda girar estoque e vender mais por cliente.', 'coleção que sai da arara'],
    casa: ['Casa e decoração', 'Quem tá reformando ou mobiliando em {cidade} pensa na {empresa} primeiro?', 'Trabalho com {oferta} pra loja de casa e decoração aparecer na hora da compra grande.', 'lembrada na hora da compra grande'],
    auto: ['Carro e moto', 'Quando um carro quebra em {cidade}, o dono lembra da {empresa} ou pega o primeiro do Google?', 'Trabalho com {oferta} pra oficina e loja de carro ganhar cliente fiel e serviço recorrente.', 'cliente que volta na próxima revisão'],
    obra: ['Construção e reforma', 'Os orçamentos que a {empresa} manda viram obra fechada ou ficam no vácuo?', 'Trabalho com {oferta} pra quem constrói e reforma fechar mais orçamento.', 'orçamento que vira obra'],
    servicos: ['Serviços pra casa e empresa', 'Hoje o cliente da {empresa} chega mais por indicação ou consegue achar vocês sozinho?', 'Trabalho com {oferta} pra prestador de serviço ter cliente chegando além da indicação.', 'cliente além da indicação'],
    escritorio: ['Escritórios e profissionais', 'De onde vêm os clientes novos da {empresa}: indicação ou alguma coisa que vocês fazem todo mês?', 'Trabalho com {oferta} pra escritório e profissional liberal ter cliente novo todo mês, com a seriedade que a profissão pede.', 'cliente novo todo mês, com seriedade'],
    eventos: ['Festas e eventos', 'A agenda da {empresa} pros próximos meses já tá fechada ou ainda tem data livre?', 'Trabalho com {oferta} pra quem vive de festa e evento fechar as datas livres.', 'as datas livres fechadas'],
    pet: ['Pet', 'Quem tem cachorro ou gato no bairro conhece a {empresa} pelo nome?', 'Trabalho com {oferta} pra pet shop e veterinário virar o lugar de confiança do bairro.', 'o pet shop de confiança do bairro'],
    turismo: ['Turismo e hospedagem', 'Fora do feriado, a {empresa} fica cheia ou sobra vaga?', 'Trabalho com {oferta} pra hospedagem e turismo encher também a baixa temporada.', 'ocupação fora do feriado'],
    varejo: ['Comércio e varejo', 'Quem passa na frente da {empresa} entra, e quem entra volta?', 'Trabalho com {oferta} pra loja de bairro vender mais pro cliente que já conhece e atrair quem não conhece.', 'mais gente entrando e voltando'],
    industria: ['Indústria e produção', 'Quando um cliente grande procura fornecedor como a {empresa}, ele acha vocês?', 'Trabalho com {oferta} pra indústria e fabricante abrir cliente novo e vender pra empresa.', 'fornecedor que o cliente grande acha'],
    agro: ['Agro e campo', 'O produtor da região conhece a {empresa} antes de fechar a próxima compra?', 'Trabalho com {oferta} pra quem vende pro campo chegar no produtor na hora certa da safra.', 'lembrado na hora da safra'],
    tech: ['Tecnologia e comunicação', 'Como a {empresa} acha cliente novo hoje, fora a indicação?', 'Trabalho com {oferta} pra empresa de tecnologia e comunicação ter cliente chegando todo mês.', 'cliente chegando todo mês'],
    comunidade: ['Igrejas, ONGs e associações', 'A {empresa} consegue chegar em todo mundo que podia participar ou ajudar?', 'Trabalho com {oferta} pra associação, igreja e ONG chegar em mais gente e ter mais apoio.', 'mais gente participando e apoiando'],
    financeiro: ['Dinheiro, seguros e imóveis', 'Quem precisa de {nicho} em {cidade} confia na {empresa} antes da primeira conversa?', 'Trabalho com {oferta} pra quem vende imóvel, seguro e crédito ser procurado em vez de ter que procurar.', 'ser procurado em vez de procurar'],
    cultura: ['Arte, cultura e lazer', 'Na próxima programação da {empresa}, a casa enche ou fica gente faltando?', 'Trabalho com {oferta} pra espaço de cultura e lazer encher cada data.', 'casa cheia em cada data'],
    transporte: ['Transporte e logística', 'Quando uma empresa de {cidade} precisa mandar carga ou mudar, ela lembra da {empresa}?', 'Trabalho com {oferta} pra transportadora e logística fechar contrato fixo, não só frete solto.', 'contrato fixo, não só frete solto']
  };
  /* [nome, ramo, palavras do nome, filtro do mapa]. O filtro: "chave=valor" ou "chave~a|b" (vira ^(a|b)$), separados por ";" */
  const L = [
    /* comida e bebida */
    ['Restaurantes', 'comida', 'restaurante|cantina|trattoria|bistro|bistrô', 'amenity=restaurant'],
    ['Lanchonetes', 'comida', 'lanchonete|lanches|lanche|snack', 'amenity=fast_food'],
    ['Hamburguerias', 'comida', 'hamburgueria|burger|burguer|smash', ''],
    ['Pizzarias', 'comida', 'pizzaria|pizza|pizzas', ''],
    ['Sushi e comida japonesa', 'comida', 'sushi|temaki|japones|japonês|japonesa|oriental|yakisoba', ''],
    ['Churrascarias', 'comida', 'churrascaria|churrasco|rodizio|rodízio|costela|parrilla', ''],
    ['Espetinhos', 'comida', 'espetinho|espetaria|espeto', ''],
    ['Marmitarias e quentinhas', 'comida', 'marmitaria|marmita|marmitex|quentinha|refeição|refeicoes|refeições', ''],
    ['Self-service e por quilo', 'comida', 'self service|selfservice|por quilo|comida caseira|buffet livre', ''],
    ['Pastelarias', 'comida', 'pastelaria|pastel|pasteis|pastéis', ''],
    ['Açaí', 'comida', 'acai|açaí|açai|acaí', ''],
    ['Sorveterias', 'comida', 'sorveteria|sorvete|gelato|gelateria|picolé|picole', 'amenity=ice_cream'],
    ['Padarias', 'comida', 'padaria|panificadora|panificação|panificacao|pães', 'shop=bakery'],
    ['Confeitarias e docerias', 'comida', 'confeitaria|doceria|doces|bolos|brigadeiro|brigaderia', 'shop~confectionery|pastry'],
    ['Cafeterias', 'comida', 'cafeteria|café|coffee|cafés', 'amenity=cafe'],
    ['Casas de chá e empórios', 'comida', 'empório|emporio|casa de chá|casa de cha|delicatessen|deli', 'shop~deli|tea'],
    ['Bares e botecos', 'comida', 'boteco|botequim|buteco|petiscaria|bar do|bar da|bar e|bar de', 'amenity=bar'],
    ['Choperias e cervejarias', 'comida', 'choperia|chopperia|cervejaria|chopp|chope|brewpub|beer', 'amenity=pub'],
    ['Adegas e distribuidoras de bebida', 'comida', 'adega|distribuidora de bebidas|bebidas|conveniência|conveniencia', 'shop~alcohol|beverages'],
    ['Lojas de vinho', 'comida', 'vinhos|vinho|wine|enoteca', 'shop=wine'],
    ['Food trucks', 'comida', 'food truck|foodtruck|trailer', ''],
    ['Comida árabe', 'comida', 'arabe|árabe|esfiha|esfiharia|kebab|shawarma|libanes|libanês', ''],
    ['Comida mexicana', 'comida', 'mexicano|mexicana|taco|tacos|burrito|nachos', ''],
    ['Comida italiana e massas', 'comida', 'italiano|italiana|massas|cantina|nonna|pasta', ''],
    ['Comida chinesa e tailandesa', 'comida', 'chines|chinês|chinesa|china|tailandes|tailandês|thai|wok', ''],
    ['Comida nordestina e mineira', 'comida', 'nordestino|nordestina|mineiro|mineira|baião|baiao|tapioca|sertão', ''],
    ['Comida vegana e natural', 'comida', 'vegano|vegana|vegetariano|natural|naturebas|plant based|fit food|saudável', ''],
    ['Cachorro-quente', 'comida', 'hot dog|hotdog|cachorro quente|dogão|dogao', ''],
    ['Crepes e tapiocas', 'comida', 'crepe|creperia|tapioca|tapiocaria|waffle', ''],
    ['Açougues e casas de carne', 'comida', 'açougue|acougue|casa de carnes|boutique de carnes|carnes', 'shop=butcher'],
    ['Peixarias', 'comida', 'peixaria|pescados|frutos do mar|peixes', 'shop=seafood'],
    ['Hortifrútis e sacolões', 'comida', 'hortifruti|hortifrúti|sacolão|sacolao|quitanda|verdurão|frutas', 'shop=greengrocer'],
    ['Queijarias e laticínios', 'comida', 'queijaria|queijos|laticínios|laticinios|frios', 'shop=cheese'],
    ['Lojas de produtos naturais', 'comida', 'produtos naturais|granel|grãos|graos|loja natural|suplementos naturais', 'shop~health_food|nutrition_supplements'],
    ['Chocolaterias', 'comida', 'chocolate|chocolateria|cacau|bombons', 'shop=chocolate'],
    ['Cozinhas industriais e refeições pra empresa', 'comida', 'cozinha industrial|refeições coletivas|refeicoes coletivas|alimentação corporativa', ''],
    ['Bolos caseiros e salgados pra festa', 'comida', 'salgados|salgadinhos|bolo caseiro|bolos caseiros|coxinha|kit festa', ''],
    ['Cachaçarias e alambiques', 'comida', 'cachaçaria|cachacaria|alambique|cachaça|cachaca', ''],
    ['Pamonharias', 'comida', 'pamonharia|pamonha|milho verde|curau', ''],
    ['Casas de sucos e vitaminas', 'comida', 'sucos|suco|vitaminas|juice', ''],

    /* beleza */
    ['Salões de beleza', 'beleza', 'salão|salao|cabeleireiro|cabeleireira|hair', 'shop=hairdresser'],
    ['Barbearias', 'beleza', 'barbearia|barber|barbeiro', 'shop~hairdresser|barber'],
    ['Manicures e esmalterias', 'beleza', 'manicure|esmalteria|unhas|nail|pedicure', 'shop=nail_salon'],
    ['Estúdios de sobrancelha e cílios', 'beleza', 'sobrancelha|sobrancelhas|cílios|cilios|lash|brow|design de sobrancelha', ''],
    ['Clínicas de estética', 'beleza', 'estética|estetica|estetic|clínica de estética|beauty', 'shop=beauty'],
    ['Depilação', 'beleza', 'depilação|depilacao|depil|laser', ''],
    ['Maquiadoras', 'beleza', 'maquiagem|maquiadora|make|makeup|make up', ''],
    ['Lojas de cosméticos', 'beleza', 'cosméticos|cosmeticos|perfumaria|perfumes|beleza', 'shop~cosmetics|perfumery'],
    ['Estúdios de tatuagem', 'beleza', 'tattoo|tatuagem|tatuador|tatuadora|piercing', 'shop=tattoo'],
    ['Spas e massagem', 'beleza', 'day spa|massagem|massoterapia|relaxamento|spa urbano', 'shop=massage'],
    ['Bronzeamento', 'beleza', 'bronzeamento|bronze|marquinha', ''],
    ['Tranças e cabelo afro', 'beleza', 'tranças|trancas|afro|box braids|crespo|cacheado', ''],
    ['Podologia', 'beleza', 'podologia|podólogo|podologo|podóloga', 'healthcare=podiatrist'],
    ['Micropigmentação', 'beleza', 'micropigmentação|micropigmentacao|micro', ''],

    /* saúde */
    ['Dentistas e odontologia', 'saude', 'odonto|odontologia|dentista|dental|sorriso|ortodontia|implante', 'amenity=dentist'],
    ['Clínicas médicas', 'saude', 'clínica médica|clinica medica|policlínica|policlinica|centro médico', 'amenity=clinic'],
    ['Consultórios médicos', 'saude', 'consultório|consultorio|médico|medico|médica', 'amenity=doctors'],
    ['Pediatras', 'saude', 'pediatra|pediatria|infantil|criança', ''],
    ['Ginecologistas e obstetras', 'saude', 'ginecologia|ginecologista|obstetra|mulher|gestante', ''],
    ['Dermatologistas', 'saude', 'dermatologia|dermatologista|dermato|pele', ''],
    ['Oftalmologistas', 'saude', 'oftalmologia|oftalmologista|olhos|visão|visao', ''],
    ['Ortopedistas', 'saude', 'ortopedia|ortopedista|coluna|joelho', ''],
    ['Cardiologistas', 'saude', 'cardiologia|cardiologista|coração|coracao|cardio', ''],
    ['Psicólogos', 'saude', 'psicologia|psicólogo|psicologo|psicóloga|psicologa|terapia', 'healthcare=psychotherapist'],
    ['Psiquiatras', 'saude', 'psiquiatria|psiquiatra|saúde mental', ''],
    ['Nutricionistas', 'saude', 'nutrição|nutricao|nutricionista|nutri|dieta', 'healthcare=nutrition_counselling'],
    ['Fisioterapia', 'saude', 'fisioterapia|fisio|reabilitação|rpg|pilates clínico', 'healthcare=physiotherapist'],
    ['Fonoaudiologia', 'saude', 'fonoaudiologia|fono|fonoaudióloga|fonoaudiologa', 'healthcare=speech_therapist'],
    ['Terapia ocupacional e autismo', 'saude', 'terapia ocupacional|autismo|neurodesenvolvimento|terapia aba', ''],
    ['Laboratórios de exames', 'saude', 'laboratório|laboratorio|análises clínicas|analises|exames|diagnóstico', 'healthcare=laboratory'],
    ['Clínicas de imagem', 'saude', 'imagem|ultrassom|raio x|tomografia|ressonância|radiologia', ''],
    ['Farmácias e drogarias', 'saude', 'farmácia|farmacia|drogaria|drogas|pharma', 'amenity=pharmacy'],
    ['Farmácias de manipulação', 'saude', 'manipulação|manipulacao|farmácia de manipulação|fórmula', ''],
    ['Óticas', 'saude', 'ótica|otica|óculos|oculos|lentes', 'shop=optician'],
    ['Aparelhos auditivos', 'saude', 'auditivo|audição|audicao|aparelho auditivo|aparelhos auditivos', 'shop=hearing_aids'],
    ['Ortopedia técnica e produtos médicos', 'saude', 'ortopédicos|ortopedicos|produtos médicos|hospitalar|cadeira de rodas', 'shop=medical_supply'],
    ['Clínicas veterinárias', 'pet', 'veterinária|veterinaria|veterinário|veterinario|clínica veterinária|hospital veterinário', 'amenity=veterinary'],
    ['Acupuntura e terapias integrativas', 'saude', 'acupuntura|reiki|terapia holística|holistica|holística|ayurveda|homeopatia', 'healthcare=alternative'],
    ['Quiropraxia', 'saude', 'quiropraxia|quiropraxista|osteopatia|osteopata', ''],
    ['Home care e cuidadores', 'saude', 'home care|cuidador|cuidadora|enfermagem domiciliar|cuidados', ''],
    ['Casas de repouso', 'saude', 'casa de repouso|residencial sênior|lar de idosos|geriátrico|geriatrico', 'amenity=social_facility'],
    ['Clínicas de vacina', 'saude', 'vacina|vacinação|vacinacao|imunização|imunizacao', ''],
    ['Planos de saúde (corretoras)', 'financeiro', 'plano de saúde|planos de saúde|plano de saude|unimed|amil|corretora de saúde', ''],

    /* esporte e bem-estar */
    ['Academias', 'fitness', 'academia|fitness|gym|musculação|musculacao', 'leisure=fitness_centre'],
    ['Crossfit e funcional', 'fitness', 'crossfit|cross training|funcional|treinamento funcional', ''],
    ['Estúdios de pilates', 'fitness', 'pilates|studio pilates|estúdio de pilates', ''],
    ['Yoga e meditação', 'fitness', 'yoga|ioga|meditação|meditacao|mindfulness', ''],
    ['Escolas de luta', 'fitness', 'jiu jitsu|jiu-jitsu|muay thai|boxe|judô|judo|karatê|karate|mma|kickboxing|taekwondo', 'leisure=sports_centre'],
    ['Escolas de dança', 'fitness', 'dança|danca|ballet|balé|dance|zumba|forró|samba de gafieira', 'leisure=dance'],
    ['Natação e escolas de natação', 'fitness', 'natação|natacao|piscina|aquática|aquatica|swim', 'leisure=swimming_pool'],
    ['Personal trainers', 'fitness', 'personal|personal trainer|treinador|assessoria esportiva', ''],
    ['Assessorias de corrida', 'fitness', 'corrida|running|assessoria de corrida|treino de corrida', ''],
    ['Quadras e society', 'fitness', 'society|quadra|futsal|futebol|arena|beach tennis|vôlei|volei', 'leisure=pitch'],
    ['Beach tennis e padel', 'fitness', 'beach tennis|padel|paddle|tênis|tenis', ''],
    ['Escolinhas de futebol', 'fitness', 'escolinha de futebol|escola de futebol|futebol infantil', ''],
    ['Clubes', 'fitness', 'clube|country club|associação recreativa|recreativo', 'leisure=sports_centre'],
    ['Lojas de esporte', 'fitness', 'esportes|esporte|sport|artigos esportivos', 'shop=sports'],
    ['Suplementos', 'fitness', 'suplementos|suplemento|whey|nutrition|growth', 'shop=nutrition_supplements'],
    ['Bicicletarias', 'fitness', 'bicicletaria|bike|bicicletas|bikes|ciclismo', 'shop=bicycle'],
    ['Escalada e esportes radicais', 'fitness', 'escalada|boulder|skate|radical|parapente|paraquedismo', ''],

    /* educação */
    ['Escolas particulares', 'educacao', 'escola|colégio|colegio|educacional|ensino', 'amenity=school'],
    ['Educação infantil e berçários', 'educacao', 'berçário|bercario|educação infantil|creche|escola infantil|maternal', 'amenity=kindergarten'],
    ['Escolas de idiomas', 'educacao', 'inglês|ingles|english|idiomas|espanhol|language|fisk|wizard|ccaa', 'amenity=language_school'],
    ['Escolas de música', 'educacao', 'escola de música|escola de musica|música|musica|aulas de violão|conservatório', 'amenity=music_school'],
    ['Cursinhos e pré-vestibular', 'educacao', 'cursinho|pré-vestibular|pre vestibular|vestibular|enem|preparatório|concursos', 'amenity=prep_school'],
    ['Reforço escolar', 'educacao', 'reforço|reforco|aulas particulares|explicadora|acompanhamento escolar', ''],
    ['Cursos profissionalizantes', 'educacao', 'profissionalizante|cursos técnicos|técnico|tecnico|senac|senai|capacitação', ''],
    ['Faculdades', 'educacao', 'faculdade|universidade|centro universitário|pós-graduação|pos graduacao', 'amenity~college|university'],
    ['Autoescolas', 'educacao', 'autoescola|auto escola|cfc|habilitação|habilitacao', 'amenity=driving_school'],
    ['Escolas de informática e programação', 'educacao', 'informática|informatica|programação|programacao|robótica|robotica|code', ''],
    ['Cursos de beleza', 'educacao', 'curso de cabeleireiro|curso de maquiagem|escola de beleza|curso de unhas', ''],
    ['Escolas de artes e teatro', 'educacao', 'teatro|artes|pintura|desenho|atelier|ateliê', ''],
    ['Escolas de gastronomia', 'educacao', 'gastronomia|culinária|culinaria|chef|confeitaria curso', ''],
    ['Escolas bilíngues', 'educacao', 'bilíngue|bilingue|bilingual|international school', ''],
    ['Kumon e métodos de estudo', 'educacao', 'kumon|método|supera|ginástica cerebral|ábaco', ''],

    /* moda e acessórios */
    ['Lojas de roupa feminina', 'moda', 'moda feminina|feminina|boutique|modas|closet', 'shop=clothes'],
    ['Lojas de roupa masculina', 'moda', 'moda masculina|masculina|alfaiataria|moda homem', 'shop=clothes'],
    ['Moda infantil', 'moda', 'moda infantil|infantil|kids|baby|criança', 'shop=baby_goods'],
    ['Moda praia e fitness', 'moda', 'moda praia|biquíni|biquini|fitness wear|moda fitness|swimwear', ''],
    ['Moda íntima e lingerie', 'moda', 'lingerie|moda íntima|moda intima|pijamas|underwear', ''],
    ['Moda evangélica e plus size', 'moda', 'plus size|moda evangélica|moda evangelica|moda gg|curvy', ''],
    ['Lojas de calçados', 'moda', 'calçados|calcados|sapataria|sapatos|tênis|tenis|shoes', 'shop=shoes'],
    ['Joalherias e semijoias', 'moda', 'joalheria|joias|jóias|semijoias|semi joias|ouro|prata|bijuterias', 'shop=jewelry'],
    ['Relojoarias', 'moda', 'relojoaria|relógios|relogios|relojoeiro', 'shop=watches'],
    ['Bolsas e acessórios', 'moda', 'bolsas|acessórios|acessorios|carteiras|malas', 'shop~bag|fashion_accessories'],
    ['Brechós', 'moda', 'brechó|brecho|second hand|segunda mão|garimpo', 'shop=second_hand'],
    ['Costureiras e ajustes', 'moda', 'costureira|costura|ajustes|consertos de roupa|alfaiate', 'craft=tailor'],
    ['Lojas de tecido e aviamentos', 'moda', 'tecidos|tecido|aviamentos|armarinho|retalhos', 'shop~fabric|haberdashery'],
    ['Vestidos de noiva e aluguel de traje', 'moda', 'noiva|noivas|aluguel de traje|traje|smoking|vestido de festa', ''],
    ['Uniformes', 'moda', 'uniformes|uniforme|confecção de uniformes|camisetas personalizadas', ''],
    ['Bonés e streetwear', 'moda', 'streetwear|street|bonés|bones|skate shop|surf shop', ''],

    /* casa e decoração */
    ['Lojas de móveis', 'casa', 'móveis|moveis|mobília|mobilia|furniture', 'shop=furniture'],
    ['Móveis planejados', 'casa', 'planejados|móveis planejados|moveis planejados|marcenaria|cozinhas planejadas', 'shop=kitchen'],
    ['Colchões', 'casa', 'colchões|colchoes|colchão|colchao|camas|sleep', 'shop=bed'],
    ['Decoração', 'casa', 'decoração|decoracao|decor|casa e cia', 'shop=interior_decoration'],
    ['Cortinas e persianas', 'casa', 'cortinas|persianas|cortina|blackout', 'shop=curtain'],
    ['Tapetes e pisos', 'casa', 'tapetes|tapete|pisos|carpete|laminado|vinílico', 'shop~carpet|flooring'],
    ['Iluminação', 'casa', 'iluminação|iluminacao|luminárias|luminarias|lustres|led', 'shop=lighting'],
    ['Eletrodomésticos', 'casa', 'eletrodomésticos|eletrodomesticos|eletro|magazine|utilidades', 'shop=appliance'],
    ['Utilidades domésticas', 'casa', 'utilidades|utensílios|utensilios|presentes|bazar', 'shop~houseware|variety_store'],
    ['Floriculturas', 'casa', 'floricultura|flores|flower|orquídeas|orquideas', 'shop=florist'],
    ['Paisagismo e jardinagem', 'casa', 'paisagismo|jardinagem|jardim|garden|plantas', 'shop=garden_centre'],
    ['Piscinas', 'casa', 'piscinas|piscina|pool|spa e piscina', 'shop=swimming_pool'],
    ['Arquitetos e designers de interiores', 'escritorio', 'arquitetura|arquiteto|arquiteta|interiores|design de interiores', 'office=architect'],
    ['Lojas de enxoval e cama, mesa e banho', 'casa', 'enxoval|cama mesa e banho|toalhas|lençóis|lencois', 'shop=household_linen'],
    ['Antiquários e molduras', 'casa', 'antiquário|antiquario|molduras|quadros|galeria de quadros', 'shop~antiques|frame'],

    /* carro e moto */
    ['Oficinas mecânicas', 'auto', 'oficina|mecânica|mecanica|auto center|autocenter', 'shop=car_repair'],
    ['Autopeças', 'auto', 'autopeças|autopecas|auto peças|peças|pecas', 'shop=car_parts'],
    ['Pneus e alinhamento', 'auto', 'pneus|pneu|alinhamento|balanceamento|borracharia', 'shop=tyres'],
    ['Lava-jatos e estética automotiva', 'auto', 'lava jato|lava-jato|lavacar|lava car|estética automotiva|polimento|detail', 'amenity=car_wash'],
    ['Funilaria e pintura', 'auto', 'funilaria|pintura automotiva|lanternagem|martelinho', ''],
    ['Auto elétricas', 'auto', 'auto elétrica|auto eletrica|elétrica automotiva|baterias', ''],
    ['Som e acessórios automotivos', 'auto', 'som automotivo|insulfilm|película|pelicula|acessórios automotivos|car audio', ''],
    ['Concessionárias', 'auto', 'concessionária|concessionaria|veículos|veiculos|motors', 'shop=car'],
    ['Lojas de carros seminovos', 'auto', 'seminovos|multimarcas|automóveis|automoveis|veículos usados', 'shop=car'],
    ['Motos e motopeças', 'auto', 'motos|moto|motopeças|motopecas|motocenter|scooter', 'shop=motorcycle'],
    ['Oficinas de moto', 'auto', 'oficina de moto|moto oficina|mecânica de motos|motoboy peças', 'shop=motorcycle_repair'],
    ['Postos de combustível', 'auto', 'posto|combustível|combustivel|auto posto|ipiranga|shell|petrobras', 'amenity=fuel'],
    ['Despachantes', 'auto', 'despachante|documentação veicular|vistoria veicular', ''],
    ['Locadoras de carro', 'auto', 'locadora|aluguel de carros|rent a car|locação de veículos', 'amenity=car_rental'],
    ['Guinchos e reboque', 'auto', 'guincho|reboque|socorro 24h|auto socorro', ''],
    ['Vidraçarias automotivas e chaveiros auto', 'auto', 'vidros automotivos|para-brisa|parabrisa|chave codificada', ''],

    /* construção e reforma */
    ['Material de construção', 'obra', 'material de construção|materiais de construção|construção|casa do construtor|depósito', 'shop~hardware|doityourself'],
    ['Madeireiras', 'obra', 'madeireira|madeiras|madeira', 'shop=trade'],
    ['Lojas de tintas', 'obra', 'tintas|tinta|colors|pinturas', 'shop=paint'],
    ['Pisos e revestimentos', 'obra', 'pisos|revestimentos|porcelanato|cerâmica|ceramica|azulejos', 'shop=tiles'],
    ['Vidraçarias', 'obra', 'vidraçaria|vidracaria|vidros|box de banheiro|espelhos', 'craft=glaziery'],
    ['Serralherias', 'obra', 'serralheria|serralheiro|portões|portoes|grades|estruturas metálicas', 'craft=metal_construction'],
    ['Marmorarias', 'obra', 'marmoraria|mármores|marmores|granitos|pedras', 'craft=stonemason'],
    ['Construtoras', 'obra', 'construtora|construções|construcoes|engenharia|incorporadora', 'office=construction_company'],
    ['Empreiteiros e pedreiros', 'obra', 'empreiteira|empreiteiro|pedreiro|reformas|reforma', 'craft=builder'],
    ['Engenheiros', 'escritorio', 'engenharia|engenheiro|engenheira|projetos estruturais|laudos', 'office=engineer'],
    ['Gesso e drywall', 'obra', 'gesso|drywall|forro|sanca|gesseiro', 'craft=plasterer'],
    ['Telhados e calhas', 'obra', 'telhados|telhado|calhas|calha|telhas|coberturas', 'craft=roofer'],
    ['Energia solar', 'obra', 'energia solar|solar|fotovoltaica|fotovoltaico|placas solares', ''],
    ['Esquadrias e alumínio', 'obra', 'esquadrias|alumínio|aluminio|janelas|portas', ''],
    ['Locação de equipamentos e caçambas', 'obra', 'locação de equipamentos|caçamba|cacamba|andaimes|betoneira|locadora de máquinas', ''],
    ['Topografia e projetos', 'obra', 'topografia|georreferenciamento|projetos|desenho técnico', ''],
    ['Impermeabilização', 'obra', 'impermeabilização|impermeabilizacao|infiltração|infiltracao|manta', ''],
    ['Hidráulica e elétrica (lojas)', 'obra', 'materiais elétricos|materiais eletricos|hidráulica|hidraulica|elétrica', 'shop=electrical'],

    /* serviços pra casa e empresa */
    ['Eletricistas', 'servicos', 'eletricista|elétrica|eletrica|instalações elétricas', 'craft=electrician'],
    ['Encanadores', 'servicos', 'encanador|desentupidora|hidráulica|hidraulica|caça vazamento', 'craft=plumber'],
    ['Ar-condicionado e refrigeração', 'servicos', 'ar condicionado|ar-condicionado|refrigeração|refrigeracao|climatização|climatizacao', 'craft=hvac'],
    ['Dedetizadoras', 'servicos', 'dedetizadora|dedetização|dedetizacao|controle de pragas|desratização', 'shop=pest_control'],
    ['Limpeza e conservação', 'servicos', 'limpeza|conservação|conservacao|faxina|higienização|higienizacao', ''],
    ['Diaristas e passadeiras', 'servicos', 'diarista|passadeira|doméstica|domestica|faxineira', ''],
    ['Lavanderias', 'servicos', 'lavanderia|lavagem|laundry|lava e seca', 'shop~laundry|dry_cleaning'],
    ['Chaveiros', 'servicos', 'chaveiro|chaves|fechaduras|cofres', 'shop=locksmith'],
    ['Assistência técnica de celular', 'servicos', 'assistência técnica|assistencia tecnica|conserto de celular|reparo|celulares', 'shop=mobile_phone'],
    ['Assistência de eletrodomésticos', 'servicos', 'conserto de geladeira|máquina de lavar|eletrodomésticos conserto|refrigeração doméstica', ''],
    ['Segurança e câmeras', 'servicos', 'segurança|seguranca|câmeras|cameras|alarmes|monitoramento|cftv', ''],
    ['Portarias e vigilância', 'servicos', 'portaria|vigilância|vigilancia|porteiro|segurança patrimonial', ''],
    ['Marido de aluguel', 'servicos', 'marido de aluguel|faz tudo|pequenos reparos|manutenção residencial', ''],
    ['Mudanças e carretos', 'transporte', 'mudanças|mudancas|carreto|carretos|fretes', 'office=moving_company'],
    ['Jardineiros', 'servicos', 'jardineiro|poda|roçada|rocada|corte de grama', 'craft=gardener'],
    ['Limpeza de estofados e caixa d\'água', 'servicos', 'estofados|lavagem de sofá|caixa dágua|caixa d água|impermeabilização de sofá', ''],
    ['Gráficas', 'servicos', 'gráfica|grafica|impressão|impressao|print|cartões de visita', 'shop=copyshop'],
    ['Comunicação visual e fachadas', 'servicos', 'comunicação visual|comunicacao visual|letreiros|fachadas|adesivos|placas|plotagem', 'craft=signmaker'],
    ['Copiadoras e papelarias', 'servicos', 'papelaria|copiadora|xerox|cópias|copias|encadernação', 'shop~stationery|copyshop'],
    ['Fotógrafos e estúdios', 'servicos', 'fotografia|fotógrafo|fotografo|studio foto|estúdio fotográfico', 'craft=photographer'],
    ['Costura industrial e bordados', 'servicos', 'bordados|bordado|silk|serigrafia|estamparia|sublimação', ''],
    ['Funerárias', 'servicos', 'funerária|funeraria|plano funeral|velório|velorio', 'shop=funeral_directors'],
    ['Coworkings', 'servicos', 'coworking|escritório compartilhado|salas comerciais|escritório virtual', ''],
    ['Contabilidade digital e BPO', 'escritorio', 'bpo|financeiro terceirizado|backoffice|contabilidade digital', ''],

    /* escritórios e profissionais */
    ['Escritórios de advocacia', 'escritorio', 'advocacia|advogados|advogado|advogada|jurídico|juridico', 'office=lawyer'],
    ['Contabilidade', 'escritorio', 'contabilidade|contábil|contabil|contador|contadora|escritório contábil', 'office=accountant'],
    ['Cartórios', 'escritorio', 'cartório|cartorio|tabelionato|registro civil|notas', 'office=notary'],
    ['Consultorias', 'escritorio', 'consultoria|consultores|assessoria empresarial|gestão', 'office=consulting'],
    ['RH e recrutamento', 'escritorio', 'recrutamento|recursos humanos|seleção|selecao|agência de empregos|empregos', 'office=employment_agency'],
    ['Despachantes e assessorias documentais', 'escritorio', 'assessoria documental|documentação|despachante imobiliário|regularização', ''],
    ['Agências de marketing', 'tech', 'agência de marketing|marketing|publicidade|propaganda|agência digital', 'office=advertising_agency'],
    ['Corretores de seguros', 'financeiro', 'corretora de seguros|corretor de seguros|seguradora|seguros', 'office=insurance'],
    ['Medicina e segurança do trabalho', 'escritorio', 'segurança do trabalho|medicina do trabalho|sesmt|saúde ocupacional', ''],
    ['Tradutores e despachos internacionais', 'escritorio', 'tradução|traducao|tradutor|juramentada|intercâmbio|intercambio', ''],
    ['Coaches e mentores', 'escritorio', 'coach|coaching|mentoria|mentor|desenvolvimento pessoal', ''],
    ['Detetives e investigação', 'escritorio', 'detetive|investigação|investigacao|investigador', ''],
    ['Leiloeiros e avaliadores', 'escritorio', 'leilão|leilao|leiloeiro|avaliação|avaliacao|perícia|pericia', ''],

    /* festas e eventos */
    ['Buffets e espaços de festa', 'eventos', 'buffet|espaço de festas|espaco de festas|salão de festas|eventos', 'amenity=events_venue'],
    ['Chácaras pra eventos', 'eventos', 'chácara|chacara|sítio de eventos|recanto|espaço rural', ''],
    ['Decoração de festas', 'eventos', 'decoração de festas|decoracao de festas|balões|baloes|festas infantis|pegue e monte', 'shop=party'],
    ['DJs e som pra eventos', 'eventos', 'dj|som e iluminação|sonorização|sonorizacao|iluminação de eventos', ''],
    ['Bandas e músicos', 'eventos', 'banda|músico|musico|cantor|cantora|voz e violão', ''],
    ['Fotógrafos de casamento', 'eventos', 'casamento|wedding|fotografia de casamento|noivos', ''],
    ['Cerimonialistas e assessoria de casamento', 'eventos', 'cerimonial|cerimonialista|assessoria de casamento|wedding planner', ''],
    ['Bolos de festa e doces finos', 'eventos', 'bolos decorados|doces finos|bem casado|bem-casado|cake designer', ''],
    ['Aluguel de mesas, cadeiras e brinquedos', 'eventos', 'locação de mesas|aluguel de mesas|pula pula|brinquedos|cama elástica|tendas', ''],
    ['Recreação infantil', 'eventos', 'recreação|recreacao|recreadores|animação infantil|personagens vivos', ''],
    ['Bartenders e open bar', 'eventos', 'bartender|open bar|drinks|coquetelaria|barman', ''],
    ['Cervejaria e chopp pra eventos', 'eventos', 'chopp delivery|chope delivery|chopeira|barril', ''],
    ['Convites e papelaria de festa', 'eventos', 'convites|papelaria personalizada|lembrancinhas|personalizados', ''],
    ['Casas noturnas e baladas', 'cultura', 'balada|night|club|casa noturna|boate', 'amenity=nightclub'],
    ['Produtoras de eventos e shows', 'cultura', 'produtora de eventos|produções|producoes|eventos e shows|entretenimento', ''],

    /* pet */
    ['Pet shops', 'pet', 'pet shop|petshop|pet center|rações|racoes|ração|racao', 'shop=pet'],
    ['Banho e tosa', 'pet', 'banho e tosa|tosa|groomer|estética animal', 'shop=pet_grooming'],
    ['Hotéis e creches pra cachorro', 'pet', 'hotel pet|hotelzinho|creche canina|dog hotel|daycare', 'amenity=animal_boarding'],
    ['Adestradores', 'pet', 'adestramento|adestrador|comportamento animal|dog training', 'amenity=animal_training'],
    ['Agropet', 'pet', 'agropet|agro pet|ração e cia|casa de rações', ''],
    ['Dog walkers e pet sitters', 'pet', 'dog walker|passeador|pet sitter|cuidador de pets', ''],

    /* turismo e hospedagem */
    ['Hotéis', 'turismo', 'hotel|hotéis|hoteis|plaza hotel', 'tourism=hotel'],
    ['Pousadas', 'turismo', 'pousada|recanto|refúgio|refugio', 'tourism=guest_house'],
    ['Hostels', 'turismo', 'hostel|albergue', 'tourism=hostel'],
    ['Motéis', 'turismo', 'motel|motéis', 'tourism=motel'],
    ['Agências de viagem', 'turismo', 'turismo|viagens|agência de viagens|travel|excursões|excursoes', 'shop=travel_agency'],
    ['Hotéis fazenda e resorts', 'turismo', 'hotel fazenda|resort|termas|águas termais|aguas termais', ''],
    ['Aluguel de temporada e chalés', 'turismo', 'chalé|chale|chalés|temporada|airbnb|cabana', 'tourism~chalet|apartment'],
    ['Parques e atrações', 'turismo', 'parque aquático|parque aquatico|parque|atração|atracao|ecoturismo', 'tourism=attraction'],
    ['Pesqueiros', 'turismo', 'pesqueiro|pesque pague|pesque e pague|lagoa de pesca', ''],
    ['Campings', 'turismo', 'camping|acampamento|glamping', 'tourism=camp_site'],

    /* comércio e varejo */
    ['Mercados e mercearias', 'varejo', 'mercado|mercearia|minimercado|supermercado', 'shop~supermarket|convenience'],
    ['Atacados e atacarejos', 'varejo', 'atacado|atacarejo|distribuidora|cash', 'shop=wholesale'],
    ['Lojas de conveniência', 'varejo', 'conveniência|conveniencia|loja de conveniência', 'shop=convenience'],
    ['Lojas de variedades e 1,99', 'varejo', 'variedades|bazar|1,99|tudo por|loja de presentes', 'shop~variety_store|gift'],
    ['Lojas de celular e acessórios', 'varejo', 'celulares|capinhas|acessórios para celular|smartphone|iphone', 'shop=mobile_phone'],
    ['Informática', 'varejo', 'informática|informatica|computadores|notebook|gamer', 'shop~computer|electronics'],
    ['Lojas de games', 'varejo', 'games|videogame|playstation|xbox|nintendo|geek', 'shop=video_games'],
    ['Livrarias', 'varejo', 'livraria|livros|sebo|books', 'shop=books'],
    ['Lojas de brinquedos', 'varejo', 'brinquedos|brinquedo|toys|brinquedoteca', 'shop=toys'],
    ['Lojas de instrumentos musicais', 'varejo', 'instrumentos musicais|música|musical|violões|guitarras', 'shop=musical_instrument'],
    ['Tabacarias e headshops', 'varejo', 'tabacaria|headshop|narguilé|narguile|tabaco|charutaria', 'shop=tobacco'],
    ['Lojas de produtos religiosos e artigos', 'varejo', 'artigos religiosos|livraria católica|umbanda|candomblé|esotérico|esoterico', 'shop=religion'],
    ['Lojas de artesanato e armarinho', 'varejo', 'artesanato|armarinho|crochê|croche|linhas|mdf', 'shop=craft'],
    ['Lojas de festa e embalagens', 'varejo', 'embalagens|artigos para festa|descartáveis|descartaveis', ''],
    ['Lojas de presentes e souvenirs', 'varejo', 'presentes|souvenir|lembranças|lembrancas|gifts', 'shop=gift'],
    ['Perfumarias e importados', 'varejo', 'importados|perfumes importados|perfumaria', 'shop=perfumery'],
    ['Lojas de bebê', 'varejo', 'bebê|baby|enxoval de bebê|maternidade|loja de bebê', 'shop=baby_goods'],
    ['Farmácias veterinárias e agropecuárias', 'agro', 'agropecuária|agropecuaria|casa da lavoura|produtos agropecuários', 'shop=agrarian'],
    ['Lojas de móveis usados', 'varejo', 'móveis usados|moveis usados|usados|compra e venda', 'shop=second_hand'],
    ['Lojas de pesca e camping', 'varejo', 'pesca|camping|caça|aventura|outdoor', 'shop~fishing|outdoor'],
    ['Lojas de colchão e estofado', 'casa', 'estofados|sofás|sofas|reformas de estofados', ''],
    ['Feiras e mercados municipais', 'varejo', 'feira|mercado municipal|feirão|feirao|sacolão', 'amenity=marketplace'],
    ['Distribuidoras de gás e água', 'varejo', 'gás|botijão|botijao|água mineral|agua mineral|distribuidora de gás', 'shop=gas'],

    /* indústria e produção */
    ['Metalúrgicas', 'industria', 'metalúrgica|metalurgica|usinagem|tornearia|caldeiraria|metal', 'craft=metal_construction'],
    ['Confecções e facções', 'industria', 'confecção|confeccao|facção|faccao|confecções|têxtil|textil', ''],
    ['Indústrias de alimentos', 'industria', 'indústria de alimentos|alimentos|frigorífico|frigorifico|laticínio|laticinio', ''],
    ['Fábricas de móveis', 'industria', 'fábrica de móveis|fabrica de moveis|indústria moveleira|movelaria', 'craft=carpenter'],
    ['Gráficas industriais e embalagens', 'industria', 'embalagens|caixas de papelão|rótulos|rotulos|flexografia', ''],
    ['Indústrias químicas e de limpeza', 'industria', 'química|quimica|produtos de limpeza|saneantes|cosméticos indústria', ''],
    ['Plásticos e injeção', 'industria', 'plásticos|plasticos|injeção|injecao|polímeros|termoformagem', ''],
    ['Cervejarias artesanais (fábrica)', 'industria', 'cervejaria artesanal|microcervejaria|craft beer|brewing', 'craft=brewery'],
    ['Marcenarias', 'industria', 'marcenaria|marceneiro|carpintaria|móveis sob medida', 'craft=carpenter'],
    ['Estofadores', 'industria', 'estofador|estofaria|tapeceiro|reforma de estofados', 'craft=upholsterer'],
    ['Panificação industrial e congelados', 'industria', 'congelados|salgados congelados|pão de queijo|massas congeladas', ''],
    ['Fábricas de gelo e água', 'industria', 'fábrica de gelo|gelo|envasadora|água mineral fábrica', ''],
    ['Reciclagem e sucata', 'industria', 'reciclagem|sucata|ferro velho|recicláveis|reciclaveis', 'amenity=recycling'],
    ['Manutenção industrial', 'industria', 'manutenção industrial|automação industrial|automacao|caldeiras|compressores', ''],

    /* agro e campo */
    ['Agropecuárias', 'agro', 'agropecuária|agropecuaria|agro|rural|casa do produtor', 'shop=agrarian'],
    ['Produtores rurais e fazendas', 'agro', 'fazenda|sítio|sitio|agrícola|agricola|produtor rural', ''],
    ['Cooperativas', 'agro', 'cooperativa|coop|cooperativismo', 'office=cooperative'],
    ['Revendas de máquinas agrícolas', 'agro', 'máquinas agrícolas|maquinas agricolas|tratores|implementos', 'shop=agrarian'],
    ['Cerealistas e armazéns', 'agro', 'cerealista|armazém|armazem|grãos|graos|silos', ''],
    ['Haras e criadores de cavalo', 'agro', 'haras|cavalos|equino|equitação|equitacao|hipismo', ''],
    ['Viveiros de mudas', 'agro', 'viveiro|mudas|horto|plantas ornamentais', 'shop=garden_centre'],
    ['Veterinários de grande porte', 'agro', 'veterinário rural|bovinos|gado|zootecnia|pecuária', ''],
    ['Topógrafos e georreferenciamento rural', 'agro', 'car rural|georreferenciamento rural|ccir|regularização fundiária', ''],
    ['Apicultores e mel', 'agro', 'apicultura|apiário|apiario|própolis|propolis|mel puro', ''],

    /* tecnologia e comunicação */
    ['Empresas de software', 'tech', 'software|sistemas|tecnologia|tech|desenvolvimento de software', 'office=it'],
    ['Provedores de internet', 'tech', 'internet|provedor|fibra|telecom|wifi|banda larga', 'office=telecommunication'],
    ['Assistência técnica de informática', 'tech', 'informática|manutenção de computadores|suporte técnico|redes e cabeamento', 'shop=computer'],
    ['Produtoras de vídeo', 'tech', 'produtora audiovisual|audiovisual|filmagem|produtora de vídeo', ''],
    ['Estúdios de gravação', 'tech', 'estúdio de gravação|estudio de gravacao|gravadora|podcast|mixagem', ''],
    ['Rádios e jornais locais', 'tech', 'rádio|radio|jornal|portal de notícias|emissora', 'office=newspaper'],
    ['Designers e estúdios criativos', 'tech', 'estúdio criativo|branding|identidade visual|ilustração|design gráfico', ''],
    ['Social media e influenciadores', 'tech', 'social media|influencer|criador de conteúdo|conteúdo digital', ''],
    ['Lojas virtuais e e-commerce', 'tech', 'loja virtual|e-commerce|ecommerce|shop online|store', ''],
    ['Startups', 'tech', 'startup|inovação|inovacao|aceleradora|incubadora', ''],

    /* igrejas, ONGs e associações */
    ['Igrejas evangélicas', 'comunidade', 'igreja|assembleia|batista|presbiteriana|ministério|ministerio|evangélica', 'amenity=place_of_worship'],
    ['Paróquias e comunidades católicas', 'comunidade', 'paróquia|paroquia|igreja católica|santuário|capela|diocese', 'amenity=place_of_worship'],
    ['Centros espíritas', 'comunidade', 'centro espírita|espirita|espírita|kardec|casa espírita', ''],
    ['ONGs e projetos sociais', 'comunidade', 'instituto|projeto social|fundação|fundacao|ação social|organização social', 'office=ngo'],
    ['Associações e sindicatos', 'comunidade', 'associação|associacao|sindicato|federação|federacao|clube de serviço', 'office~association|union'],
    ['Associações de bairro e condomínios', 'comunidade', 'associação de moradores|condomínio|condominio|residencial|síndico', ''],
    ['Lojas maçônicas e clubes de serviço', 'comunidade', 'rotary|lions|maçonaria|maconaria|loja maçônica', 'club=freemasonry'],
    ['Proteção animal', 'comunidade', 'proteção animal|protecao animal|adoção|adocao|abrigo de animais|resgate', 'amenity=animal_shelter'],

    /* dinheiro, seguros e imóveis */
    ['Imobiliárias', 'financeiro', 'imobiliária|imobiliaria|imóveis|imoveis|corretor de imóveis', 'office=estate_agent'],
    ['Corretores de imóveis autônomos', 'financeiro', 'corretor|corretora|creci|consultor imobiliário', ''],
    ['Loteadoras e incorporadoras', 'financeiro', 'loteamento|loteadora|incorporadora|empreendimentos|condomínio fechado', ''],
    ['Administradoras de condomínio', 'financeiro', 'administradora de condomínios|gestão condominial|síndico profissional', ''],
    ['Correspondentes bancários e crédito', 'financeiro', 'correspondente bancário|empréstimo|emprestimo|consignado|crédito|credito|financiamento', 'office=financial'],
    ['Consórcios', 'financeiro', 'consórcio|consorcio|carta de crédito|carta de credito', ''],
    ['Cooperativas de crédito', 'financeiro', 'sicredi|sicoob|cooperativa de crédito|cooperativa de credito|cresol', 'amenity=bank'],
    ['Casas de câmbio', 'financeiro', 'câmbio|cambio|exchange|moeda estrangeira', 'amenity=bureau_de_change'],
    ['Assessores de investimento', 'financeiro', 'investimentos|assessoria de investimentos|wealth|planejamento financeiro', ''],
    ['Lotéricas', 'financeiro', 'lotérica|loterica|loterias|casa lotérica', ''],

    /* arte, cultura e lazer */
    ['Teatros e casas de show', 'cultura', 'teatro|casa de shows|auditório|auditorio|anfiteatro', 'amenity=theatre'],
    ['Cinemas', 'cultura', 'cinema|cine|cinemark|cinépolis|cinepolis', 'amenity=cinema'],
    ['Galerias de arte e ateliês', 'cultura', 'galeria de arte|galeria|ateliê|atelie|artista plástico', 'shop=art'],
    ['Museus e centros culturais', 'cultura', 'museu|centro cultural|casa de cultura|memorial', 'tourism=museum'],
    ['Boliches, sinuca e games', 'cultura', 'boliche|sinuca|bilhar|fliperama|lan house', 'leisure=bowling_alley'],
    ['Escape rooms e paintball', 'cultura', 'escape room|paintball|airsoft|laser tag|kart', ''],
    ['Kartódromos', 'cultura', 'kart|kartódromo|kartodromo', 'sport=karting'],
    ['Karaokês', 'cultura', 'karaokê|karaoke', ''],
    ['Parques infantis e buffets kids', 'cultura', 'playground|espaço kids|parque infantil|cama elástica', 'leisure=playground'],
    ['Estúdios de foto e vídeo pra alugar', 'cultura', 'estúdio para alugar|aluguel de estúdio|ciclorama', ''],
    ['Bibliotecas e espaços de leitura', 'cultura', 'biblioteca|livros|leitura|gibiteca', 'amenity=library'],

    /* transporte e logística */
    ['Transportadoras', 'transporte', 'transportadora|transportes|cargas|logística|logistica', 'office=logistics'],
    ['Motoboys e entregas', 'transporte', 'motoboy|motofrete|entregas rápidas|courier', 'office=courier'],
    ['Fretamento e vans', 'transporte', 'fretamento|vans|turismo e fretamento|transporte executivo', ''],
    ['Transporte escolar', 'transporte', 'transporte escolar|tio da van|van escolar', ''],
    ['Táxis e motoristas particulares', 'transporte', 'táxi|taxi|motorista particular|executivo|transfer', 'amenity=taxi'],
    ['Guarda-móveis e self storage', 'transporte', 'guarda móveis|guarda-móveis|self storage|depósito|box de armazenagem', 'shop=storage_rental'],
    ['Despacho e correios privados', 'transporte', 'agência de correios|correios|franquia correios|sedex', 'amenity=post_office'],
    ['Caminhoneiros e agregados', 'transporte', 'caminhão|caminhao|frete de caminhão|munck|truck', ''],
    ['Oficinas de caminhão e diesel', 'transporte', 'diesel|caminhões|caminhoes|truck center|oficina de caminhão|bomba injetora', '']
  ];
  /* "chave=valor;chave~a|b" → [['chave','=','valor'], ['chave','~','^(a|b)$']] (o mesmo formato do horus-turbo.js) */
  const filtros = s => String(s || '').split(';').filter(Boolean).map(f => {
    const m = f.match(/^([a-z_]+)([=~])([a-z0-9_|]+)$/); if(!m) return null;
    return m[2] === '=' ? [m[1], '=', m[3]] : [m[1], '~', `^(${m[3]})$`];
  }).filter(Boolean);
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 26);
  const vistos = new Set();
  const lista = L.map(([n, g, re, osm]) => {
    let k = 'c_' + slug(n); while(vistos.has(k)) k += '2'; vistos.add(k);
    const r = G[g] || G.servicos;
    return { k, n, g, re, osm: filtros(osm), hook: r[1], valor: r[2], gancho: r[3], prio: 'warm', cat: true };
  });
  window.CORRE_HORUS_NICHOS = { grupos: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v[0]])), lista };

  /* ---------- a janela do catálogo ----------
     Abre por cima da folha de Ajustar (um <dialog>, pra não perder o que a pessoa já mexeu), com a busca, os ramos e a
     lista pra marcar. "ja" são as chaves que a pessoa já tem; "cabe" quantos ainda cabem; "fim" recebe os escolhidos */
  window.Corre.horusCatalogo = function(o){
    const C = window.Corre, esc = C.esc, ico = C.ico, ja = new Set(o.ja || []), cabe = Math.max(0, o.cabe | 0), sel = new Set();
    const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let ramo = '', q = '';
    const d = document.createElement('dialog'); d.className = 'dlg hz-cat-dlg';
    d.innerHTML = `<div class="dlg-c hz-cat"><div class="hz-cat-cab"><h2>${ico('lupa')} Catálogo de nichos</h2><button type="button" class="cbtn plain" data-hc="x" aria-label="Fechar">${ico('x')}</button></div>
      <p>${lista.length} tipos de negócio prontos. Marca os que você quer caçar: cada um já vem com as palavras que acham ele no mapa e a pergunta, o valor e o gancho do ramo (dá pra ajustar depois).</p>
      <input class="inp" type="search" id="hc-cat-q" placeholder="Procurar: pizzaria, dentista, oficina…" aria-label="Procurar nicho" autocomplete="off">
      <div class="hz-cat-ramos" role="group" aria-label="Ramos"><button type="button" class="hz-chip light" data-ramo="" aria-pressed="true">Todos</button>${Object.entries(G).map(([k, v]) => `<button type="button" class="hz-chip light" data-ramo="${k}" aria-pressed="false">${esc(v[0])}</button>`).join('')}</div>
      <ul class="hz-cat-l" id="hc-cat-l"></ul>
      <div class="acts hz-cat-pe"><span class="hz-cat-n" id="hc-cat-n" aria-live="polite"></span><button type="button" class="btn pri" data-hc="ok" disabled>Adicionar</button></div></div>`;
    document.body.appendChild(d);
    const ul = d.querySelector('#hc-cat-l'), ok = d.querySelector('[data-hc="ok"]'), cont = d.querySelector('#hc-cat-n');
    const conta = () => { cont.textContent = cabe ? `${sel.size} de ${cabe} que ainda cabem` : 'O Hórus já tá com 30 nichos: tira algum pra pôr outro.'; ok.disabled = !sel.size; ok.textContent = sel.size ? `Adicionar ${sel.size}` : 'Adicionar'; };
    const pinta = () => {
      const t = norm(q).trim(), ws = t.split(/\s+/).filter(Boolean);
      const L2 = lista.filter(n => (!ramo || n.g === ramo) && (!ws.length || ws.every(w => norm(n.n + ' ' + n.re.replace(/\|/g, ' ') + ' ' + G[n.g][0]).includes(w))));
      ul.innerHTML = L2.length ? L2.map(n => { const tem = ja.has(n.k); return `<li><label class="hz-cat-i${tem ? ' tem' : ''}"><input type="checkbox" value="${n.k}"${tem ? ' checked disabled' : sel.has(n.k) ? ' checked' : ''}><span><b>${esc(n.n)}</b><small>${esc(G[n.g][0])}${n.osm.length ? ' · acha no mapa' : ''}${tem ? ' · já tá no teu Hórus' : ''}</small></span></label></li>`; }).join('')
        : '<li class="hz-cat-vazio">Nenhum nicho com isso. Tenta outra palavra, ou cria o teu em "+ Nicho".</li>';
    };
    d.addEventListener('click', e => {
      const r = e.target.closest('[data-ramo]');
      if(r){ ramo = r.dataset.ramo; d.querySelectorAll('[data-ramo]').forEach(b => b.setAttribute('aria-pressed', String(b === r))); pinta(); return; }
      const h = e.target.closest('[data-hc]');
      if(h && h.dataset.hc === 'x'){ d.close(); return; }
      if(h && h.dataset.hc === 'ok'){ const out = lista.filter(n => sel.has(n.k)).map(n => ({ k: n.k, n: n.n, prio: n.prio, re: n.re, osm: n.osm, hook: n.hook, valor: n.valor, gancho: n.gancho })); d.close(); o.fim(out); }
    });
    ul.addEventListener('change', e => {
      const c = e.target.closest('input[type="checkbox"]'); if(!c || c.disabled) return;
      if(c.checked){ if(sel.size >= cabe){ c.checked = false; C.toast(cabe ? `Cabem só mais ${cabe} nichos (o Hórus guarda até 30).` : 'O Hórus já tá com 30 nichos.'); return; } sel.add(c.value); }
      else sel.delete(c.value);
      conta();
    });
    d.querySelector('#hc-cat-q').addEventListener('input', e => { q = e.target.value; pinta(); });
    d.addEventListener('close', () => d.remove());
    pinta(); conta();
    try{ d.showModal(); }catch(e){ d.setAttribute('open', ''); }
    d.querySelector('#hc-cat-q').focus();
  };
})();
