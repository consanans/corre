// CORRE · função "imagem": o estúdio de posts pede, a IA desenha (e escreve a legenda).
// Imagem: usa as referências da marca (posts puxados do Instagram, fotos, print do feed) como guia de estilo.
// Legenda (acao: "legenda"): lê a arte pronta e o contexto da marca e devolve gancho, corpo, chamada,
// hashtags e o texto alternativo, no tom das últimas legendas da marca.
//
// Segredos (Supabase > Edge Functions > Secrets):
//   OPENAI_API_KEY        obrigatório. A chave fica SÓ aqui, nunca no site.
//   IMAGEM_MODELO         opcional (padrão gpt-image-1-mini)
//   IMAGEM_QUALIDADE      opcional: low | medium | high (padrão medium)
//   IMAGEM_LIMITE_GRATIS  opcional, imagens por dia no plano grátis (padrão 5)
//   IMAGEM_LIMITE_PRO     opcional, imagens por dia no Pro (padrão 40)
//   LEGENDA_MODELO        opcional (padrão gpt-5-mini)
//   LEGENDA_LIMITE_GRATIS opcional, legendas por dia no grátis (padrão 30)
//   LEGENDA_LIMITE_PRO    opcional, legendas por dia no Pro (padrão 200)
//   MODELO_RESERVA        opcional (padrão gpt-4.1-mini): texto, quando a conta da OpenAI ainda não foi verificada
//   (sem verificação a OpenAI não libera gpt-5-mini nem gpt-image-1; a imagem cai pro dall-e-3, sem as referências)
//   HORUS_LIMITE_GRATIS   opcional, mensagens/leituras do Hórus por dia no grátis (padrão 40)
//   HORUS_LIMITE_PRO      opcional, mensagens/leituras do Hórus por dia no Pro (padrão 300)
//   MARCA_LIMITE_GRATIS   opcional, textos e nomes do Studio Houzi por dia no grátis (padrão 12)
//   MARCA_LIMITE_PRO      opcional, textos e nomes do Studio Houzi por dia no Pro (padrão 80)
// Hórus (acao: "abordagem" ou "resposta"): escreve a mensagem de WhatsApp sob medida pra empresa
// Hórus 4 (acao: "montar"): monta o radar inteiro (nichos, filtros do mapa, faro e mensagens) a partir de uma frase
// e lê a resposta do cliente (o que ele quis dizer, a etapa, quando retomar e a réplica pronta).
// Studio Houzi (acao: "marca"): escreve os textos da marca e do brandbook, e (v3.41) a buyer persona e a brand persona;
// (acao: "nomes"): sugere nomes com o porquê.
// Studio (acao: "pauta", v3.38): a pauta do mês inteiro de uma vez (tema, título da arte e cena), conta como uma legenda.
// Correal (v3.38): acabou o grátis do dia, o pedido com "correal: true" gasta a moeda do Correverso (imagem 10, legenda e
// pauta 2, Hórus 2, Studio Houzi 3; os preços ficam no banco). acao "cotas": o que já foi usado hoje e a carteira.
// A devolução (quando a IA falha depois do desconto) usa a SUPABASE_SERVICE_ROLE_KEY, que o Supabase já põe sozinho.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const env = (k: string, d = '') => Deno.env.get(k) || d;
const MODELO = env('IMAGEM_MODELO', 'gpt-image-1-mini');
const QUALIDADE = ['low', 'medium', 'high'].includes(env('IMAGEM_QUALIDADE')) ? env('IMAGEM_QUALIDADE') : 'medium';
const LIMITE: Record<string, number> = {
  gratis: Math.max(0, Number(env('IMAGEM_LIMITE_GRATIS', '5')) || 0),
  pro: Math.max(0, Number(env('IMAGEM_LIMITE_PRO', '40')) || 0),
};
const MAX_REF = 5 * 1024 * 1024;
const LEG_MODELO = env('LEGENDA_MODELO', 'gpt-5-mini');
const LEG_LIMITE: Record<string, number> = {
  gratis: Math.max(0, Number(env('LEGENDA_LIMITE_GRATIS', '30')) || 0),
  pro: Math.max(0, Number(env('LEGENDA_LIMITE_PRO', '200')) || 0),
};

const HZ_LIMITE: Record<string, number> = {
  gratis: Math.max(0, Number(env('HORUS_LIMITE_GRATIS', '40')) || 0),
  pro: Math.max(0, Number(env('HORUS_LIMITE_PRO', '300')) || 0),
};

const RESERVA_TXT = env('MODELO_RESERVA', 'gpt-4.1-mini');
const precisaVerificar = (m: string) => /must be verified|verify (your )?organization|organization verification/i.test(m || '');

/* reserva a vaga do dia no banco, com trava (vale contra pedidos em paralelo); conta tentativa, não só sucesso */
const cota = async (sb: any, tipo: string, lim: number) => { const { data, error } = await sb.rpc('corre_cota_minha', { p_tipo: tipo, p_lim: lim }); return !error && data === true; };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/* v3.38 · CORREAL: a moeda do Correverso. O grátis do dia acabou? Se a pessoa topou (correal: true no pedido), o banco
   desconta o preço da carteira dela (corre_correal_gasta, pelo login dela) e a IA trabalha; se a IA falhar depois do
   desconto, a função devolve (corre_correal_devolve, com a chave de serviço). Preço e saldo ficam no banco. */
type Extra = { pago: number; tipo: string; saldo: number | null };
async function vaga(sb: any, tipo: string, lim: number, feitas: number, body: any, X: Extra): Promise<Response | null> {
  if (feitas < lim && await cota(sb, tipo, lim)) return null;
  const { data: w, error: ew } = await sb.rpc('corre_correal_meu');
  if (ew || !w) return json({ erro: 'limite', restam: 0 }, 429);
  const preco = Number(w.precos?.[tipo]) || 0, saldo = Number(w.saldo) || 0;
  if (!preco) return json({ erro: 'limite', restam: 0 }, 429);
  const info = { erro: 'limite', restam: 0, preco, correal: saldo, hoje: w.hoje, teto: w.teto };
  if (body?.correal !== true) return json(info, 429);
  const { data: g, error: eg } = await sb.rpc('corre_correal_gasta', { p_tipo: tipo });
  if (eg || !g?.ok) return json({ ...info, correal: Number(g?.saldo ?? saldo) || 0, sem_correal: true }, 429);
  X.pago = Number(g.preco) || preco; X.tipo = tipo; X.saldo = Number(g.saldo);
  return null;
}
/* fecha o pedido: deu certo com correal, a resposta leva o saldo; deu errado depois do desconto, devolve */
async function fecha(r: Response, X: Extra, admin: any, uid: string) {
  if (!X.pago) return r;
  const corpo = await r.text();
  let j: any = null; try { j = JSON.parse(corpo); } catch (_) { return new Response(corpo, { status: r.status, headers: r.headers }); }
  if (r.status >= 400) {
    let saldo = X.saldo;
    if (admin) {
      const { data, error } = await admin.rpc('corre_correal_devolve', { p_dono: uid, p_tipo: X.tipo });
      if (error) console.error('correal devolve:', error.message); else if (data?.ok) saldo = Number(data.saldo);
    } else console.error('correal: sem SUPABASE_SERVICE_ROLE_KEY pra devolver', X.tipo);
    return json({ ...j, correal: saldo, devolvido: saldo !== X.saldo }, r.status);
  }
  return json({ ...j, correal: X.saldo, pago: X.pago }, r.status);
}

// começo do dia em Brasília (UTC-3), em UTC
function inicioDoDia() {
  const br = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return new Date(`${br}T03:00:00Z`).toISOString();
}

// texto: tenta o modelo configurado; se a conta não foi verificada, refaz no modelo reserva
async function chat(payload: any, KEY: string) {
  const call = (p: any) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(p),
  });
  let resp = await call(payload);
  let out: any = await resp.json().catch(() => null);
  if (!resp.ok && precisaVerificar(out?.error?.message) && payload.model !== RESERVA_TXT) {
    const p2: any = { ...payload, model: RESERVA_TXT, temperature: 0.8 };
    delete p2.reasoning_effort;
    resp = await call(p2);
    out = await resp.json().catch(() => null);
  }
  return { resp, out };
}

const txt = (v: unknown, n: number) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n);

const SISTEMA = `Você escreve legendas de Instagram em português do Brasil para a marca descrita no contexto.
Devolva só o JSON pedido.
- gancho: uma frase de até 120 caracteres que faça a pessoa parar de rolar. Concreta, sem "Você sabia", sem clickbait vazio, sem repetir o título da arte palavra por palavra.
- corpo: 2 a 4 parágrafos curtos (até 700 caracteres no total), falando do que a arte mostra e por que importa pra quem segue a marca. Use só as informações do contexto e da imagem: não invente preço, data, endereço, promoção, número ou depoimento.
- cta: uma frase curta e específica pro objetivo do post (salvar, comentar, chamar no direct, passar na loja, link na bio...).
- hashtags: de 6 a 12, minúsculas e sem acento, ligadas à marca, ao nicho e à cidade quando informada. Nada genérico tipo #love #instagood #tbt.
- alt: descrição objetiva da imagem pra quem não enxerga, até 300 caracteres.
Tom: se vierem legendas anteriores da marca, siga o mesmo tom, ritmo e jeito de falar. Se não vierem, direto, humano e com personalidade, sem jargão corporativo e sem frase motivacional pronta. No máximo 2 emojis na legenda inteira.`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['gancho', 'corpo', 'cta', 'hashtags', 'alt'],
  properties: {
    gancho: { type: 'string' }, corpo: { type: 'string' }, cta: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } }, alt: { type: 'string' },
  },
};

async function legenda(sb: any, user: any, body: any, KEY: string, X: Extra) {
  const c = body?.ctx || {};
  const ctx = {
    marca: txt(c.marca, 60), segmento: txt(c.segmento, 60), instagram: txt(c.rede, 30), cidade: txt(c.cidade, 60),
    modelo_da_arte: txt(c.modelo, 20), chamada_pequena: txt(c.kicker, 40), titulo_da_arte: txt(c.titulo, 140),
    texto_da_arte: txt(c.texto, 300), numero_em_destaque: txt(c.numero, 18), cena_da_imagem: txt(c.cena, 400),
    tema: txt(c.tema, 40), data_do_post: txt(c.data, 10), objetivo: txt(c.objetivo, 140),
    legendas_anteriores: (Array.isArray(c.anteriores) ? c.anteriores : []).slice(0, 3).map((x: unknown) => txt(x, 1200)).filter(Boolean),
  };
  if (!ctx.marca) return json({ erro: 'prompt' }, 400);
  const img = typeof body?.arte === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.arte) && body.arte.length < 2_000_000 ? body.arte : '';

  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = LEG_LIMITE[perfil.plano] ?? LEG_LIMITE.gratis;
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true })
    .eq('dono', user.id).eq('tipo', 'legenda').gte('created_at', inicioDoDia());
  const feitas = count ?? 0;
  { const v = await vaga(sb, 'legenda', lim, feitas, body, X); if (v) return v; }

  const conteudo: any[] = [{ type: 'text', text: 'Contexto do post:\n' + JSON.stringify(ctx, null, 1) }];
  if (img) conteudo.push({ type: 'image_url', image_url: { url: img, detail: 'low' } });
  const payload: any = {
    model: LEG_MODELO,
    messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: conteudo }],
    response_format: { type: 'json_schema', json_schema: { name: 'legenda', strict: true, schema: SCHEMA } },
    max_completion_tokens: 4000,
  };
  if (/^(gpt-5|o\d)/.test(LEG_MODELO)) payload.reasoning_effort = 'low'; else payload.temperature = 0.8;

  let out: any = null, resp: Response;
  try { ({ resp, out } = await chat(payload, KEY)); } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  if (!resp.ok) {
    const msg = out?.error?.message || `HTTP ${resp.status}`;
    console.error('legenda:', resp.status, msg);
    if (resp.status === 401) return json({ erro: 'sem_chave' }, 503);
    return json({ erro: 'provedor', detalhe: msg }, 502);
  }
  let l: any = null;
  try { l = JSON.parse(out?.choices?.[0]?.message?.content || ''); } catch (_) { /* cai abaixo */ }
  if (!l || !l.gancho) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);

  await sb.from('corre_geracoes').insert({ tipo: 'legenda', prompt: ctx.marca + ' · ' + (ctx.titulo_da_arte || ctx.tema).slice(0, 200), marca_id: typeof body?.marca_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.marca_id) ? body.marca_id : null });
  const tags = (Array.isArray(l.hashtags) ? l.hashtags : []).map((t: unknown) => '#' + String(t).replace(/^#+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, ''))
    .filter((t: string) => t.length > 2).slice(0, 15);
  return json({
    gancho: txt(l.gancho, 150), corpo: txt(l.corpo, 1800), cta: txt(l.cta, 140),
    tags: [...new Set(tags)].join(' '), alt: txt(l.alt, 1000), restam: Math.max(0, lim - feitas - 1),
  });
}

// ---------- Studio (v3.38): a pauta do mês de uma vez (conta como uma legenda) ----------
const PAUTA_SISTEMA = `Você monta a pauta de posts de Instagram de um mês para a marca descrita no contexto, em português do Brasil.
Devolva só o JSON pedido: exatamente um item por data recebida, na mesma ordem das datas.
- tema: uma palavra que diga o tipo do post: Produto, Bastidor, Dica, Pergunta, Marca, Cliente, Chamada, Data ou Assunto.
- titulo: a frase grande que vai escrita na arte, até 60 caracteres, sem ponto final. Concreta e com a cara da marca. Nada de clichê ("Qualidade em primeiro lugar", "Venha conferir", "O melhor da cidade").
- cena: o que a foto mostra, numa frase de até 220 caracteres pensada pra um gerador de imagem: o objeto ou o momento, o enquadramento e a luz. Sem texto escrito na imagem, sem logotipo, sem pessoa famosa.
Regras:
- Varie: não repita o mesmo tema em dois posts seguidos e não repita os títulos que a marca já usou.
- Os assuntos que a pessoa escreveu entram primeiro, espalhados pelo mês, do jeito que ela escreveu.
- Data comercial do nicho que cai até 10 dias depois de um post ganha esse post (tema Data), sem inventar promoção.
- Não invente preço, desconto, promoção, sorteio, endereço, horário, número, prêmio ou depoimento. Não prometa o que a marca não disse.
- Fale com o público da marca, no nicho dela e na cidade quando informada.`;
const PAUTA_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['itens'],
  properties: {
    itens: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['tema', 'titulo', 'cena'], properties: { tema: { type: 'string' }, titulo: { type: 'string' }, cena: { type: 'string' } } },
    },
  },
};
async function pauta(sb: any, user: any, body: any, KEY: string, X: Extra) {
  const c = body?.ctx || {};
  const dataOk = (d: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
  const ctx = {
    marca: txt(c.marca, 60), segmento: txt(c.segmento, 60), instagram: txt(c.instagram, 30), cidade: txt(c.cidade, 60),
    assuntos_da_pessoa: txt(c.assunto, 600),
    datas: (Array.isArray(c.datas) ? c.datas : []).filter((d: any) => d && dataOk(d.data)).slice(0, 31).map((d: any) => ({ data: d.data, dia: txt(d.dia, 10) })),
    datas_comerciais: (Array.isArray(c.datas_comerciais) ? c.datas_comerciais : []).filter((d: any) => d && dataOk(d.data)).slice(0, 12).map((d: any) => ({ nome: txt(d.nome, 60), data: d.data })),
    titulos_ja_usados: (Array.isArray(c.anteriores) ? c.anteriores : []).slice(0, 12).map((x: unknown) => txt(x, 140)).filter(Boolean),
  };
  if (!ctx.marca || !ctx.datas.length) return json({ erro: 'prompt' }, 400);

  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = LEG_LIMITE[perfil.plano] ?? LEG_LIMITE.gratis;
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true })
    .eq('dono', user.id).eq('tipo', 'legenda').gte('created_at', inicioDoDia());
  const feitas = count ?? 0;
  { const v = await vaga(sb, 'legenda', lim, feitas, body, X); if (v) return v; }

  const payload: any = {
    model: LEG_MODELO,
    messages: [{ role: 'system', content: PAUTA_SISTEMA }, { role: 'user', content: 'Contexto da marca e do mês:\n' + JSON.stringify(ctx, null, 1) }],
    response_format: { type: 'json_schema', json_schema: { name: 'pauta', strict: true, schema: PAUTA_SCHEMA } },
    max_completion_tokens: 8000,
  };
  if (/^(gpt-5|o\d)/.test(LEG_MODELO)) payload.reasoning_effort = 'low'; else payload.temperature = 0.9;

  let out: any = null, resp: Response;
  try { ({ resp, out } = await chat(payload, KEY)); } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  if (!resp.ok) {
    const msg = out?.error?.message || `HTTP ${resp.status}`;
    console.error('pauta:', resp.status, msg);
    if (resp.status === 401) return json({ erro: 'sem_chave' }, 503);
    return json({ erro: 'provedor', detalhe: msg }, 502);
  }
  let l: any = null;
  try { l = JSON.parse(out?.choices?.[0]?.message?.content || ''); } catch (_) { /* cai abaixo */ }
  const itens = (Array.isArray(l?.itens) ? l.itens : []).slice(0, ctx.datas.length)
    .map((x: any) => ({ tema: txt(x?.tema, 20), titulo: txt(x?.titulo, 80).replace(/[.。]+$/, ''), cena: txt(x?.cena, 300) })).filter((x: any) => x.titulo);
  if (!itens.length) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);

  await sb.from('corre_geracoes').insert({ tipo: 'legenda', prompt: ('pauta · ' + ctx.marca).slice(0, 200), marca_id: typeof body?.marca_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.marca_id) ? body.marca_id : null });
  return json({ itens, restam: Math.max(0, lim - feitas - 1) });
}

// ---------- Hórus: abordagem e leitura de resposta ----------
const HZ_ABORDAGEM = `Você escreve mensagens de WhatsApp de prospecção em português do Brasil, para quem vende sozinho ou numa equipe pequena e manda a mensagem do próprio celular.
Devolva só o JSON pedido.
- mensagem: a mensagem pronta pro tipo pedido (tipo_de_mensagem). Comece com a saudação informada (saudacao) e se apresente pelo nome (eu) e pelo que vende (oferta).
  Fale com a empresa pelo nome curto. Use o nicho, o bairro e as anotações pra mostrar que não é disparo em massa.
  Faça uma pergunta que toque numa dor real daquele tipo de negócio (use pergunta_que_doi e o_que_resolve como base, sem copiar palavra por palavra).
  Termine com um pedido pequeno e fácil de responder (sim/não, um dia, um horário).
  Se vier sinais_da_empresa (ex.: sem site, sem Instagram, várias unidades), use o mais forte como prova de que você olhou a empresa, sem acusar nem dar lição.
  Abordagem: até 450 caracteres. Retomar, mostra e último toque: até 260 caracteres, sem repetir a abordagem. Interessado: marca uma conversa ou visita.
  Proposta/link: só aqui coloque o link_url, se vier.
- alternativa: outra versão, com outro ângulo (outra dor ou outro pedido), mesmo tamanho.
- por_que: uma linha dizendo o ângulo da mensagem principal.
Regras: não invente preço, desconto, prazo, número, cliente, prêmio nem dado da empresa que não esteja no contexto. Nada de "Prezado", "Espero que esteja bem", "Venho por meio desta", caixa alta ou pressão. No máximo 1 emoji. Escreva como gente, frases curtas.`;

const HZ_RESPOSTA = `Você ajuda um vendedor a responder um cliente no WhatsApp, em português do Brasil. O contexto traz quem vende, o que vende, a empresa, a etapa e o histórico. Em resposta_do_cliente está o que o cliente mandou.
Devolva só o JSON pedido.
- leitura: a categoria que melhor descreve a resposta.
- resumo: uma linha com o que o cliente quis dizer de verdade.
- etapa: a etapa do funil depois dessa resposta (contato = segue conversando sem interesse claro; interesse = quer saber mais ou topou conversar; link = pediu proposta, preço fechado ou link pra contratar; fechado = disse que vai contratar ou contratou; perdido = não quer).
- retorno_em_dias: em quantos dias falar de novo (0 = agora, até 30).
- replica: a resposta pronta pra mandar, até 500 caracteres, natural, sem pressão, respondendo exatamente o que ele disse. Preço/caro: mostre o valor com o que está no contexto e devolva uma pergunta. "Manda mais info": 2 ou 3 linhas e uma pergunta que qualifica. "Não é comigo": pergunte com quem falar. Sem interesse: agradeça e deixe a porta aberta. Interesse: proponha um dia e um horário pra conversar ou visitar.
- dica: uma linha de estratégia pro vendedor (o que observar, o que não fazer).
Regras: não invente preço, condição, prazo nem promessa que não esteja no contexto. No máximo 1 emoji.`;

const HZ_LEITURAS = ['interessado', 'quer_saber_mais', 'pediu_preco', 'objecao_preco', 'sem_tempo_agora', 'ja_tem', 'nao_e_comigo', 'sem_interesse', 'duvida', 'outro'];
const HZ_SCHEMA_A = {
  type: 'object', additionalProperties: false, required: ['mensagem', 'alternativa', 'por_que'],
  properties: { mensagem: { type: 'string' }, alternativa: { type: 'string' }, por_que: { type: 'string' } },
};
const HZ_SCHEMA_R = {
  type: 'object', additionalProperties: false, required: ['leitura', 'resumo', 'etapa', 'retorno_em_dias', 'replica', 'dica'],
  properties: {
    leitura: { type: 'string', enum: HZ_LEITURAS }, resumo: { type: 'string' },
    etapa: { type: 'string', enum: ['contato', 'interesse', 'link', 'fechado', 'perdido'] },
    retorno_em_dias: { type: 'integer' }, replica: { type: 'string' }, dica: { type: 'string' },
  },
};

// Hórus 4 (acao: "montar"): a pessoa diz numa frase o que vende e a IA monta o radar inteiro
const HZ_MONTAR = `Você monta um radar de prospecção (o Hórus) pra quem vende sozinho ou numa equipe pequena, no Brasil.
A pessoa descreve numa frase o que vende. Devolva só o JSON pedido.
- oferta: como ela se apresenta numa mensagem, curto e em minúsculas (ex.: "energia solar pra comércio", "contabilidade"), até 60 caracteres.
- nichos: de 5 a 9 tipos de empresa (ou cliente) que mais compram isso, do mais quente pro mais frio. Pra cada um:
  n: nome curto no plural (ex.: "Padarias e confeitarias"); prio: hot, warm ou cold;
  palavras: palavras que aparecem no nome dessas empresas, separadas por | (minúsculas; ex.: "padaria|panificadora|confeitaria");
  osm: até 3 filtros do OpenStreetMap que acham esse tipo no mapa. chave: shop, amenity, office, craft, leisure, healthcare, tourism, industrial ou man_made; op "=" pra um valor (ex.: amenity = pharmacy) ou "~" pra uma lista no formato ^(bakery|pastry)$. Só tags que existem de verdade no OSM. Lista vazia se não der pra achar no mapa.
  hook: a pergunta que dói, específica do nicho, com {empresa} no lugar do nome (até 180 caracteres);
  valor: o que a pessoa resolve pra esse nicho, numa frase (até 200);
  gancho: uma linha curta pra retomar a conversa (até 90).
- tpl: as mensagens de WhatsApp da cadência, curtas e humanas, usando as variáveis {oi} {eu} {empresa} {nicho} {hook} {valor} {gancho} {oferta} {link} {cidade} {minha_cidade} {sinal}.
  abordagem: até 450 caracteres; comece com "{oi} Aqui é {eu}, {oferta} de {minha_cidade}."; ponha {sinal} sozinho numa linha; depois "{hook} {valor}"; termine com um pedido pequeno.
  retomar até 220, mostra até 260 (use {link}), ultimo até 200, interesse até 220, link até 220 (use {link}).
- faro: quais sinais públicos mostram que a empresa precisa do que a pessoa vende, entre sem_site, sem_insta, so_fixo, sem_horario, rede, nova, aberto_tarde, 24h.
Regras: nada de "Prezado", caixa alta, promessa de resultado, preço ou número inventado. No máximo 1 emoji no total.`;
const HZ_FARO = ['sem_site', 'sem_insta', 'so_fixo', 'sem_horario', 'rede', 'nova', 'aberto_tarde', '24h'];
const HZ_SCHEMA_M = {
  type: 'object', additionalProperties: false, required: ['oferta', 'nichos', 'tpl', 'faro'],
  properties: {
    oferta: { type: 'string' },
    nichos: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['n', 'prio', 'palavras', 'osm', 'hook', 'valor', 'gancho'],
      properties: { n: { type: 'string' }, prio: { type: 'string', enum: ['hot', 'warm', 'cold'] }, palavras: { type: 'string' },
        osm: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['chave', 'op', 'valor'], properties: { chave: { type: 'string' }, op: { type: 'string', enum: ['=', '~'] }, valor: { type: 'string' } } } },
        hook: { type: 'string' }, valor: { type: 'string' }, gancho: { type: 'string' } } } },
    tpl: { type: 'object', additionalProperties: false, required: ['abordagem', 'retomar', 'mostra', 'ultimo', 'interesse', 'link'],
      properties: { abordagem: { type: 'string' }, retomar: { type: 'string' }, mostra: { type: 'string' }, ultimo: { type: 'string' }, interesse: { type: 'string' }, link: { type: 'string' } } },
    faro: { type: 'array', items: { type: 'string', enum: HZ_FARO } },
  },
};
async function montar(sb: any, user: any, body: any, KEY: string, X: Extra) {
  const frase = txt(body?.frase, 300);
  if (frase.length < 6) return json({ erro: 'prompt' }, 400);
  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = HZ_LIMITE[perfil.plano] ?? HZ_LIMITE.gratis;
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true }).eq('dono', user.id).eq('tipo', 'abordagem').gte('created_at', inicioDoDia());
  { const v = await vaga(sb, 'abordagem', lim, count ?? 0, body, X); if (v) return v; }
  const payload: any = {
    model: LEG_MODELO,
    messages: [{ role: 'system', content: HZ_MONTAR }, { role: 'user', content: `O que eu vendo: ${frase}\nMinha cidade: ${txt(body?.cidade, 60) || 'Brasil'}` }],
    response_format: { type: 'json_schema', json_schema: { name: 'montar', strict: true, schema: HZ_SCHEMA_M } },
    max_completion_tokens: 6000,
  };
  if (/^(gpt-5|o\d)/.test(LEG_MODELO)) payload.reasoning_effort = 'low'; else payload.temperature = 0.6;
  let out: any = null, resp: Response;
  try { ({ resp, out } = await chat(payload, KEY)); } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  if (!resp.ok) { const msg = out?.error?.message || `HTTP ${resp.status}`; console.error('montar:', resp.status, msg); return json({ erro: resp.status === 401 ? 'sem_chave' : 'provedor', detalhe: msg }, resp.status === 401 ? 503 : 502); }
  let r: any = null;
  try { r = JSON.parse(out?.choices?.[0]?.message?.content || ''); } catch (_) { /* cai abaixo */ }
  if (!r || !Array.isArray(r.nichos) || r.nichos.length < 3) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);
  await sb.from('corre_geracoes').insert({ tipo: 'abordagem', prompt: `montar · ${frase}`.slice(0, 200) });
  return json({
    oferta: txt(r.oferta, 80),
    nichos: r.nichos.slice(0, 10).map((n: any) => ({ n: txt(n.n, 40), prio: ['hot', 'warm', 'cold'].includes(n.prio) ? n.prio : 'warm', palavras: txt(n.palavras, 300),
      osm: (Array.isArray(n.osm) ? n.osm : []).slice(0, 4).map((f: any) => ({ chave: txt(f.chave, 20), op: f.op === '~' ? '~' : '=', valor: txt(f.valor, 120) })),
      hook: txt(n.hook, 300), valor: txt(n.valor, 300), gancho: txt(n.gancho, 160) })),
    tpl: Object.fromEntries(['abordagem', 'retomar', 'mostra', 'ultimo', 'interesse', 'link'].map((k) => [k, txt(r.tpl?.[k], 1200)])),
    faro: (Array.isArray(r.faro) ? r.faro : []).filter((k: string) => HZ_FARO.includes(k)),
    restam: Math.max(0, lim - (count ?? 0) - 1),
  });
}

async function horus(sb: any, user: any, body: any, KEY: string, X: Extra) {
  const modo = body?.acao === 'resposta' ? 'resposta' : 'abordagem';
  const c = body?.ctx || {};
  const ctx: Record<string, unknown> = {
    saudacao: txt(c.saudacao, 20), eu: txt(c.eu, 40), oferta: txt(c.oferta, 80), cidade: txt(c.cidade, 60), link_url: txt(c.link_url, 300),
    empresa: txt(c.empresa, 120), nicho: txt(c.nicho, 60), bairro: txt(c.bairro, 80), instagram: txt(c.instagram, 30), anotacoes: txt(c.anotacoes, 600),
    etapa: txt(c.etapa, 30), pergunta_que_doi: txt(c.pergunta_que_doi, 300), o_que_resolve: txt(c.o_que_resolve, 300), gancho: txt(c.gancho, 160),
    tipo_de_mensagem: txt(c.tipo_de_mensagem, 40), modelo_atual: txt(c.modelo_atual, 1200),
    sinais_da_empresa: (Array.isArray(c.sinais) ? c.sinais : []).slice(0, 6).map((x: unknown) => txt(x, 40)).filter(Boolean),
    historico: (Array.isArray(c.historico) ? c.historico : []).slice(0, 10).map((x: unknown) => txt(x, 200)).filter(Boolean),
  };
  if (modo === 'resposta') ctx.resposta_do_cliente = txt(body?.resposta, 1500);
  if (!ctx.empresa || (modo === 'resposta' && !ctx.resposta_do_cliente)) return json({ erro: 'prompt' }, 400);

  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = HZ_LIMITE[perfil.plano] ?? HZ_LIMITE.gratis;
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true })
    .eq('dono', user.id).eq('tipo', 'abordagem').gte('created_at', inicioDoDia());
  const feitas = count ?? 0;
  { const v = await vaga(sb, 'abordagem', lim, feitas, body, X); if (v) return v; }

  const payload: any = {
    model: LEG_MODELO,
    messages: [{ role: 'system', content: modo === 'resposta' ? HZ_RESPOSTA : HZ_ABORDAGEM }, { role: 'user', content: 'Contexto:\n' + JSON.stringify(ctx, null, 1) }],
    response_format: { type: 'json_schema', json_schema: { name: modo, strict: true, schema: modo === 'resposta' ? HZ_SCHEMA_R : HZ_SCHEMA_A } },
    max_completion_tokens: 3000,
  };
  if (/^(gpt-5|o\d)/.test(LEG_MODELO)) payload.reasoning_effort = 'low'; else payload.temperature = 0.8;

  let out: any = null, resp: Response;
  try { ({ resp, out } = await chat(payload, KEY)); } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  if (!resp.ok) {
    const msg = out?.error?.message || `HTTP ${resp.status}`;
    console.error('horus:', resp.status, msg);
    if (resp.status === 401) return json({ erro: 'sem_chave' }, 503);
    return json({ erro: 'provedor', detalhe: msg }, 502);
  }
  let r: any = null;
  try { r = JSON.parse(out?.choices?.[0]?.message?.content || ''); } catch (_) { /* cai abaixo */ }
  if (!r || (modo === 'abordagem' ? !r.mensagem : !r.replica)) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);

  await sb.from('corre_geracoes').insert({ tipo: 'abordagem', prompt: `${modo} · ${ctx.empresa}`.slice(0, 200) });
  const restam = Math.max(0, lim - feitas - 1);
  if (modo === 'abordagem') return json({ mensagem: txt(r.mensagem, 1200), alternativa: txt(r.alternativa, 1200), por_que: txt(r.por_que, 200), restam });
  return json({
    leitura: HZ_LEITURAS.includes(r.leitura) ? r.leitura : 'outro', resumo: txt(r.resumo, 200),
    etapa: ['contato', 'interesse', 'link', 'fechado', 'perdido'].includes(r.etapa) ? r.etapa : 'contato',
    retorno_em_dias: Math.max(0, Math.min(30, Math.round(Number(r.retorno_em_dias) || 0))),
    replica: txt(r.replica, 1200), dica: txt(r.dica, 240), restam,
  });
}

// ---------- Studio Houzi: os textos da marca (acao "marca") e os nomes (acao "nomes") ----------
const MARCA_LIMITE: Record<string, number> = {
  gratis: Math.max(0, Number(env('MARCA_LIMITE_GRATIS', '12')) || 0),
  pro: Math.max(0, Number(env('MARCA_LIMITE_PRO', '80')) || 0),
};
const MARCA_SIS = `Você é redator(a) sênior de branding do Studio Houzi, um estúdio brasileiro que faz marca com conceito. Escreve em português do Brasil, com personalidade, frase curta e concreta.
Proibido: clichê de marketing ("inovador", "soluções", "experiência única", "qualidade e excelência", "transformar vidas"), frase motivacional pronta, exagero, emoji, e inventar fato que não está no contexto (prêmio, número, ano, endereço, cliente, depoimento).
Você recebe as escolhas de uma marca: o nome, o negócio, a cidade, o território criativo, a ideia do logo, o símbolo, a letra, a paleta (com o nome de cada cor), a textura, onde a marca vive e, se teve, o naming. Devolva só o JSON pedido:
- conceito: uma frase (até 160 caracteres) que diz o que a marca é, no jeito dela.
- manifesto: um parágrafo (até 600 caracteres) no tom do território.
- taglines: 5 frases curtas (até 48 caracteres cada), diferentes entre si.
- e, nao_e: 3 adjetivos cada (como a marca é e como não é).
- fala, nao_fala: 3 frases de exemplo cada (como a marca fala e como ela nunca falaria).
- bio: bio de Instagram, até 150 caracteres.
- wa: a mensagem de boas-vindas do WhatsApp, até 200 caracteres.
- Se vierem referências (o clima, o que a marca não pode parecer, o que inspira), use o clima no tom do texto e fuja do que a pessoa não quer; nunca cite nem imite marca que apareça nas referências.
- textos: o texto do brandbook, que explica o conceito de cada parte em 2 parágrafos curtos (até 520 caracteres por parte): naming (só se o contexto tiver naming; senão string vazia), logo, tipografia, cores, elementos, aplicacoes. Ligue cada escolha ao negócio e ao território e use os nomes das cores e da letra exatamente como vieram.
- buyer_persona: o cliente ideal da marca, uma pessoa INVENTADA que resume quem compra. É retrato pra guiar a comunicação: não é cliente real, nem depoimento, nem pesquisa. nome: um apelido curto e neutro (até 20 caracteres), nunca nome com sobrenome. perfil (até 240): faixa de idade (sempre faixa), a rotina e onde o dia dessa pessoa cruza com o negócio, na cidade do contexto. quer e dores: 3 frases cada (até 80): o que procura e o que incomoda hoje, concreto, do ramo. onde: 3 lugares ou momentos em que encontra a marca (até 60): Instagram, WhatsApp ou a vida real (rua, bairro, indicação, evento). decide (até 160): o que faz escolher a marca e voltar. frase (até 100): uma frase que essa pessoa diria, em primeira pessoa, coloquial.
- brand_persona: a marca como se fosse gente, no arquétipo e na personalidade que vieram (não troque o arquétipo) e coerente com e/nao_e. Não dê nome próprio: o nome dela é o da marca. retrato (até 240): começa com "Se <nome da marca> fosse gente," e diz quem seria, a idade que aparenta, como se veste, que tipo de som escuta (gênero, nunca artista), onde anda. jeito: 3 frases (até 90) de como age. gosta: 3 coisas que curte (até 60), do mundo do território. com_o_cliente (até 160): como trata a buyer_persona. frase (até 100): uma frase da marca em primeira pessoa, no jeito do território.
- Nas duas personas: gênero neutro (sem adjetivo que marque gênero); nada de nome de pessoa real, celebridade, artista, influenciador, personagem, time, marca, app ou rede social fora Instagram e WhatsApp; nada de número inventado (renda, porcentagem, quantos clientes), dado sensível (religião, política, saúde, orientação) ou estereótipo; nada de emoji.`;
const MARCA_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['conceito', 'manifesto', 'taglines', 'e', 'nao_e', 'fala', 'nao_fala', 'bio', 'wa', 'textos', 'buyer_persona', 'brand_persona'],
  properties: {
    conceito: { type: 'string' }, manifesto: { type: 'string' },
    taglines: { type: 'array', items: { type: 'string' } }, e: { type: 'array', items: { type: 'string' } }, nao_e: { type: 'array', items: { type: 'string' } },
    fala: { type: 'array', items: { type: 'string' } }, nao_fala: { type: 'array', items: { type: 'string' } }, bio: { type: 'string' }, wa: { type: 'string' },
    textos: { type: 'object', additionalProperties: false, required: ['naming', 'logo', 'tipografia', 'cores', 'elementos', 'aplicacoes'],
      properties: { naming: { type: 'string' }, logo: { type: 'string' }, tipografia: { type: 'string' }, cores: { type: 'string' }, elementos: { type: 'string' }, aplicacoes: { type: 'string' } } },
    /* v3.41: as personas do brandbook (o tamanho vai no prompt e no corte do txt/lista, como o resto) */
    buyer_persona: { type: 'object', additionalProperties: false, required: ['nome', 'perfil', 'quer', 'dores', 'onde', 'decide', 'frase'],
      properties: { nome: { type: 'string' }, perfil: { type: 'string' }, quer: { type: 'array', items: { type: 'string' } }, dores: { type: 'array', items: { type: 'string' } },
        onde: { type: 'array', items: { type: 'string' } }, decide: { type: 'string' }, frase: { type: 'string' } } },
    brand_persona: { type: 'object', additionalProperties: false, required: ['retrato', 'jeito', 'gosta', 'com_o_cliente', 'frase'],
      properties: { retrato: { type: 'string' }, jeito: { type: 'array', items: { type: 'string' } }, gosta: { type: 'array', items: { type: 'string' } },
        com_o_cliente: { type: 'string' }, frase: { type: 'string' } } },
  },
};
const NOMES_SIS = `Você cria nomes de marca pra pequeno negócio brasileiro, no Studio Houzi. Recebe o negócio, a cidade, a personalidade (5 eixos de 0 a 1: clássica→moderna, séria→divertida, sofisticada→popular, calma→energia, artesanal→tech) e palavras que a pessoa gosta.
Devolva só o JSON pedido: 10 nomes, variando a estratégia (descritivo, evocativo, inventado, origem, giria, composto, metafora). Cada um:
- nome: até 22 caracteres, fácil de falar, de escrever e de achar; sem nome de marca famosa, sem nome de pessoa real, nada ofensivo nem com duplo sentido.
- estrategia: uma das chaves acima.
- porque: até 200 caracteres: o que o nome carrega e por que ele serve pra esse negócio.
Nada de nome genérico de agência ("Soluções", "Prime", "Tech" sozinho, "Premium").
Se vierem referências (clima, o que a marca não pode parecer, marcas e estilos que inspiram), puxe os nomes pro clima pedido e fuja do que a pessoa não quer. Referência é inspiração: nunca use nem imite nome de marca que apareça nelas.`;
const NOMES_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['nomes'],
  properties: { nomes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['nome', 'estrategia', 'porque'],
    properties: { nome: { type: 'string' }, estrategia: { type: 'string', enum: ['descritivo', 'evocativo', 'inventado', 'origem', 'giria', 'composto', 'metafora'] }, porque: { type: 'string' } } } } },
};
const lista = (v: unknown, n: number, k: number) => (Array.isArray(v) ? v : []).map((x) => txt(x, k)).filter(Boolean).slice(0, n);
async function houzi(sb: any, user: any, body: any, KEY: string, X: Extra) {
  const nomes = body?.acao === 'nomes', c = body?.ctx || {};
  const ctx: any = nomes
    ? { negocio: txt(c.negocio, 80), o_que_vende: txt(c.descr, 160), cidade: txt(c.cidade, 60), personalidade: (Array.isArray(c.pers) ? c.pers : []).slice(0, 5).map((x: unknown) => Math.max(0, Math.min(1, Number(x) || 0))), palavras: txt(c.palavras, 160), ja_pensados: lista(c.ja, 12, 30),
      referencias: { clima: txt(c.clima, 160), nao_pode_parecer: txt(c.nao, 160), inspira: txt(c.marcas, 200) } }
    : {
      nome: txt(c.nome, 40), negocio: txt(c.negocio, 80), o_que_vende: txt(c.descr, 160), cidade: txt(c.cidade, 60), desde: txt(c.desde, 10), frase_atual: txt(c.tagline, 80),
      territorio: txt(c.territorio, 40), conceito_do_territorio: txt(c.frase, 120), ideia_do_logo: txt(c.gesto, 400), simbolo: txt(c.simbolo, 400), letra: txt(c.letra, 160),
      paleta: lista(c.cores, 6, 60), receita_de_cor: txt(c.receita, 160), textura: txt(c.textura, 160), onde_vive: txt(c.vive, 300), personalidade: txt(c.pers, 120), arquetipo: txt(c.arquetipo, 80),
      naming: c.naming ? { nome: txt(c.naming.nome, 40), estrategia: txt(c.naming.estrategia, 20), porque: txt(c.naming.porque, 300) } : null,
      referencias: { clima: txt(c.clima, 160), nao_pode_parecer: txt(c.nao, 160), inspira: txt(c.marcas, 200) },
    };
  if (nomes ? !ctx.negocio : !ctx.nome) return json({ erro: 'prompt' }, 400);
  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = MARCA_LIMITE[perfil.plano] ?? MARCA_LIMITE.gratis;
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true }).eq('dono', user.id).eq('tipo', 'marca').gte('created_at', inicioDoDia());
  { const v = await vaga(sb, 'marca', lim, count ?? 0, body, X); if (v) return v; }
  const payload: any = {
    model: LEG_MODELO,
    messages: [{ role: 'system', content: nomes ? NOMES_SIS : MARCA_SIS }, { role: 'user', content: (nomes ? 'O negócio:\n' : 'A marca:\n') + JSON.stringify(ctx, null, 1) }],
    response_format: { type: 'json_schema', json_schema: { name: nomes ? 'nomes' : 'marca', strict: true, schema: nomes ? NOMES_SCHEMA : MARCA_SCHEMA } },
    /* v3.41: a marca ganhou as personas; com 6000 o JSON podia sair cortado (e virar "resposta vazia") */
    max_completion_tokens: nomes ? 6000 : 9000,
  };
  if (/^(gpt-5|o\d)/.test(LEG_MODELO)) payload.reasoning_effort = 'low'; else payload.temperature = 0.85;
  let out: any = null, resp: Response;
  try { ({ resp, out } = await chat(payload, KEY)); } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  if (!resp.ok) { const msg = out?.error?.message || `HTTP ${resp.status}`; console.error('houzi:', resp.status, msg); return json({ erro: resp.status === 401 ? 'sem_chave' : 'provedor', detalhe: msg }, resp.status === 401 ? 503 : 502); }
  let r: any = null;
  try { r = JSON.parse(out?.choices?.[0]?.message?.content || ''); } catch (_) { /* cai abaixo */ }
  await sb.from('corre_geracoes').insert({ tipo: 'marca', prompt: (nomes ? 'nomes · ' + ctx.negocio : 'marca · ' + ctx.nome).slice(0, 200) });
  const restam = Math.max(0, lim - (count ?? 0) - 1);
  if (nomes) {
    if (!r || !Array.isArray(r.nomes) || !r.nomes.length) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);
    return json({ nomes: r.nomes.slice(0, 12).map((n: any) => ({ nome: txt(n.nome, 26), estrategia: txt(n.estrategia, 20), porque: txt(n.porque, 260) })).filter((n: any) => n.nome), restam });
  }
  if (!r || !r.conceito) return json({ erro: 'provedor', detalhe: 'resposta vazia' }, 502);
  const t = r.textos || {}, bp = r.buyer_persona || {}, gp = r.brand_persona || {};
  return json({
    conceito: txt(r.conceito, 200), manifesto: txt(r.manifesto, 800), taglines: lista(r.taglines, 6, 60), e: lista(r.e, 4, 30), nao_e: lista(r.nao_e, 4, 30),
    fala: lista(r.fala, 4, 120), nao_fala: lista(r.nao_fala, 4, 120), bio: txt(r.bio, 160), wa: txt(r.wa, 240),
    textos: Object.fromEntries(['naming', 'logo', 'tipografia', 'cores', 'elementos', 'aplicacoes'].map((k) => [k, txt(t[k], 700)])),
    buyer_persona: { nome: txt(bp.nome, 30), perfil: txt(bp.perfil, 320), quer: lista(bp.quer, 4, 110), dores: lista(bp.dores, 4, 110), onde: lista(bp.onde, 4, 80), decide: txt(bp.decide, 210), frase: txt(bp.frase, 130) },
    brand_persona: { retrato: txt(gp.retrato, 320), jeito: lista(gp.jeito, 4, 120), gosta: lista(gp.gosta, 4, 80), com_o_cliente: txt(gp.com_o_cliente, 210), frase: txt(gp.frase, 130) },
    restam,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const KEY = env('OPENAI_API_KEY');
  if (!KEY) return json({ erro: 'sem_chave' }, 503);

  // quem pediu (pelo login do app; as regras do banco valem como se fosse a pessoa)
  const SB_URL = env('SUPABASE_URL'), SB_ANON = env('SUPABASE_ANON_KEY');
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ erro: 'login' }, 401);
  const sb = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u } = await sb.auth.getUser(jwt);
  const user = u && u.user;
  if (!user) return json({ erro: 'login' }, 401);

  // o pedido
  let body: any = null;
  try { body = await req.json(); } catch (_) { return json({ erro: 'prompt' }, 400); }
  if (body?.acao === 'cotas') return await cotas(sb, user);
  const SERV = env('SUPABASE_SERVICE_ROLE_KEY');
  const admin = SERV ? createClient(SB_URL, SERV, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const X: Extra = { pago: 0, tipo: '', saldo: null };
  const acao = String(body?.acao || '');
  const r = acao === 'legenda' ? await legenda(sb, user, body, KEY, X)
    : acao === 'pauta' ? await pauta(sb, user, body, KEY, X)
    : acao === 'abordagem' || acao === 'resposta' ? await horus(sb, user, body, KEY, X)
    : acao === 'montar' ? await montar(sb, user, body, KEY, X)
    : acao === 'marca' || acao === 'nomes' ? await houzi(sb, user, body, KEY, X)
    : await imagem(sb, user, body, KEY, X, SB_URL);
  return await fecha(r, X, admin, user.id);
});

/* quanto a pessoa já usou hoje de cada IA, o limite grátis do plano e a carteira de correal */
async function cotas(sb: any, user: any) {
  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const ini = inicioDoDia(), plano = perfil.plano;
  const conta = async (tipo: string) => {
    const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true }).eq('dono', user.id).eq('tipo', tipo).gte('created_at', ini);
    return count ?? 0;
  };
  const [im, lg, ab, mc] = await Promise.all(['imagem', 'legenda', 'abordagem', 'marca'].map(conta));
  const { data: w } = await sb.rpc('corre_correal_meu');
  return json({
    imagem: { lim: LIMITE[plano] ?? LIMITE.gratis, usados: im }, legenda: { lim: LEG_LIMITE[plano] ?? LEG_LIMITE.gratis, usados: lg },
    abordagem: { lim: HZ_LIMITE[plano] ?? HZ_LIMITE.gratis, usados: ab }, marca: { lim: MARCA_LIMITE[plano] ?? MARCA_LIMITE.gratis, usados: mc },
    correal: w || null,
  });
}

/* a imagem (o pedido padrão, sem "acao") */
async function imagem(sb: any, user: any, body: any, KEY: string, X: Extra, SB_URL: string) {
  const prompt = String(body?.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  if (prompt.length < 12) return json({ erro: 'prompt' }, 400);
  const marca_id = typeof body?.marca_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.marca_id) ? body.marca_id : null;

  // referências: só imagens da pasta da própria pessoa no bucket "corre"
  const host = new URL(SB_URL).hostname;
  const pasta = `/storage/v1/object/public/corre/${user.id}/`;
  const refs: string[] = Array.isArray(body?.refs) ? body.refs.slice(0, 9).map(String) : [];
  for (const r of refs) {
    let x: URL;
    try { x = new URL(r); } catch (_) { return json({ erro: 'refs' }, 400); }
    if (x.protocol !== 'https:' || x.hostname !== host || !x.pathname.startsWith(pasta) || x.pathname.includes('..')) {
      return json({ erro: 'refs' }, 400);
    }
  }

  // limite do dia pelo plano
  const { data: perfil } = await sb.from('corre_perfis').select('plano').eq('id', user.id).maybeSingle();
  if (!perfil) return json({ erro: 'login' }, 401);
  const lim = LIMITE[perfil.plano] ?? LIMITE.gratis;
  const { count, error: eCount } = await sb.from('corre_geracoes')
    .select('id', { count: 'exact', head: true })
    .eq('dono', user.id).eq('tipo', 'imagem').gte('created_at', inicioDoDia());
  if (eCount) return json({ erro: 'banco', detalhe: eCount.message }, 500);
  const feitas = count ?? 0;
  { const v = await vaga(sb, 'imagem', lim, feitas, body, X); if (v) return v; }

  // chama a IA: com referência = edição guiada pelas imagens; sem = geração do zero
  let resp: Response;
  try {
    if (refs.length) {
      const fd = new FormData();
      fd.append('model', MODELO);
      fd.append('prompt', prompt);
      fd.append('size', '1024x1536');
      fd.append('quality', QUALIDADE);
      fd.append('output_format', 'jpeg');
      fd.append('output_compression', '88');
      fd.append('n', '1');
      let i = 0;
      for (const r of refs) {
        const g = await fetch(r);
        if (!g.ok) continue;
        const tipo = (g.headers.get('content-type') || '').split(';')[0];
        if (!/^image\/(jpeg|png|webp)$/.test(tipo)) continue;
        const b = await g.blob();
        if (b.size > MAX_REF) continue;
        fd.append('image[]', new File([b], `ref${++i}.${tipo.split('/')[1]}`, { type: tipo }));
      }
      if (!i) return json({ erro: 'refs' }, 400);
      resp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd,
      });
    } else {
      resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODELO, prompt, size: '1024x1536', quality: QUALIDADE,
          output_format: 'jpeg', output_compression: 88, n: 1,
        }),
      });
    }
  } catch (e) {
    return json({ erro: 'provedor', detalhe: String(e) }, 502);
  }

  let out: any = await resp.json().catch(() => null), mime = 'image/jpeg', aviso = '';
  // conta sem verificação: o gpt-image-1 não roda; o dall-e-3 gera do zero (sem as referências), na vertical
  if (!resp.ok && precisaVerificar(out?.error?.message)) {
    try {
      resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt: prompt.slice(0, 3900), size: '1024x1792', quality: 'standard', response_format: 'b64_json', n: 1 }),
      });
      out = await resp.json().catch(() => null); mime = 'image/png'; aviso = 'verificar';
    } catch (e) { return json({ erro: 'provedor', detalhe: String(e) }, 502); }
  }
  if (!resp.ok) {
    const code = out?.error?.code || '';
    const msg = out?.error?.message || `HTTP ${resp.status}`;
    console.error('imagem:', resp.status, code, msg);
    if (code === 'moderation_blocked' || /safety|moderation/i.test(msg)) return json({ erro: 'bloqueada' }, 422);
    if (resp.status === 401) return json({ erro: 'sem_chave' }, 503);
    return json({ erro: 'provedor', detalhe: msg }, 502);
  }
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return json({ erro: 'provedor', detalhe: 'sem imagem na resposta' }, 502);

  // conta no limite só o que deu certo
  await sb.from('corre_geracoes').insert({ prompt: prompt.slice(0, 600), marca_id });

  return json({ b64, mime, aviso, restam: Math.max(0, lim - feitas - 1) });
}
