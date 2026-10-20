// CORRE · função "pagamento" (v3.60): os planos, cobrados pelo Asaas.
//
// Os planos (o Thales, 16/10/2026): Studio por redes sociais (1 de graça; 2 = R$ 59,90; 3 = R$ 69,90; 4 ou mais =
// R$ 79,90), Studio Houzi R$ 29,90 e Hórus R$ 9,90 por mês, esses dois com 30 dias de graça. O preço mora AQUI (o app
// só mostra); a pessoa nunca escolhe o valor.
//
//  1. acao "assinar" { produto, nivel?, nome?, doc? }: cria o cliente no Asaas (a primeira vez, com nome e CPF/CNPJ; o
//     documento vai só pro Asaas, o Corre não guarda) e a assinatura mensal. O Asaas manda a fatura; a pessoa paga no
//     link (Pix, boleto ou cartão, ela escolhe lá). No teste grátis, a primeira cobrança vence no fim do teste.
//     No Studio, assinar de novo com outro nível troca o valor (vale da próxima fatura em diante).
//  2. acao "cancelar" { produto }: cancela no Asaas. O que já foi pago vale até o fim do período.
//  3. acao "link" { produto }: o link da fatura em aberto (pra pagar agora).
//  4. ?asaas=aviso: o Asaas avisando (pagou, venceu, cancelou). Confere o token do aviso; cada aviso vale uma vez.
//     Pra o Asaas conseguir chamar, a função fica sem "Verify JWT" (o login de quem usa o app é conferido aqui dentro).
//     acao "confere" { produto } (v3.61): olha no Asaas se a fatura já foi paga (se o aviso não chegou, o plano liga assim).
//  5. acao "asaas" (só o fundador, em Financeiro › Planos): confere a chave e cadastra (ou acerta) o webhook no Asaas
//     pela API, com o token certo. Ninguém precisa copiar token de um painel pro outro.
//  6. v3.72: "assinar" só vai com { termos: a versão dos Termos de uso que a pessoa marcou } e a função anota o aceite
//     (corre_termos_aceites, a prova do combinado). acao "desistir" { produto, ver? }: o direito de arrependimento do
//     Código de Defesa do Consumidor (art. 49), pela mesma ferramenta em que a pessoa assinou (Decreto 7.962/2013,
//     art. 5º). Até 7 dias depois do primeiro pagamento de uma assinatura, devolve tudo e o plano para na hora. Com
//     "ver", só diz se pode e quanto volta. Pix e cartão o Asaas devolve sozinho; boleto, ele dá um link pra pessoa dizer
//     a conta onde recebe. Pelo app, uma vez por plano (corre_assinaturas.desistiu_em); depois, pelo e-mail.
//  7. v4.13: as 8 skins de Halloween em real (acao "skin-comprar", "skin-confere" e "skin-desistir"; ver o bloco das skins).
//
// Segredos (Supabase > Edge Functions > Secrets):
//   ASAAS_API_KEY        a chave da API do Asaas (Asaas > Integrações > Chave de API). É o único obrigatório.
//   ASAAS_AMBIENTE       opcional: "sandbox" ou "producao". Sem ele, vale o que a chave diz ($aact_hmlg_ é o sandbox)
//   ASAAS_WEBHOOK_TOKEN  opcional: o token do aviso. Sem ele, sai da própria chave (HMAC), sempre igual pra mesma chave
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const env = (k: string, d = '') => Deno.env.get(k) || d;
/* o ambiente: o que o segredo disser; senão a chave de teste do Asaas se entrega pelo começo ($aact_hmlg_) */
const sandbox = () => env('ASAAS_AMBIENTE') ? env('ASAAS_AMBIENTE') === 'sandbox' : /^\$?aact_hmlg_/.test(env('ASAAS_API_KEY'));
const ASAAS = () => sandbox() ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const FUNDADOR = 'd1e9f6ac-f5d7-4723-8b02-eb0d1d7137b0';
/* os avisos que o Corre escuta (o resto o Asaas nem manda) */
const EVENTOS = ['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'];
/* o token do aviso: o do segredo, ou um HMAC da chave (64 letras, nunca aparece em tela nenhuma) */
async function tokenAviso() {
  if (env('ASAAS_WEBHOOK_TOKEN')) return env('ASAAS_WEBHOOK_TOKEN');
  const k = env('ASAAS_API_KEY'); if (!k) return '';
  const ck = await crypto.subtle.importKey('raw', new TextEncoder().encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, new TextEncoder().encode('corre · aviso do asaas')));
  return 'corre' + Array.from(sig, b => b.toString(16).padStart(2, '0')).join('');
}
const PRODUTOS: Record<string, string> = { studio: 'Studio', houzi: 'Studio Houzi', horus: 'Hórus' };
/* o preço de cada plano (o Studio pelo nível: quantas redes) */
const preco = (produto: string, nivel: number) =>
  produto === 'houzi' ? 29.9 : produto === 'horus' ? 9.9 : nivel >= 4 ? 79.9 : nivel === 3 ? 69.9 : nivel === 2 ? 59.9 : 0;
/* v3.61: o nível do Studio que vale é o do valor que foi PAGO (trocar de plano só libera mais redes quando a fatura
   com o valor novo é paga; antes, subir pro "4 ou mais" liberava na hora e dava pra voltar sem pagar) */
const nivelDoValor = (v: number, antes: number) => v >= 79.89 ? 4 : v >= 69.89 ? 3 : v >= 59.89 ? 2 : antes;
const descricao = (produto: string, nivel: number) =>
  produto === 'studio' ? `Corre · Studio, ${nivel >= 4 ? '4 ou mais redes sociais' : `${nivel} redes sociais`}` : `Corre · ${PRODUTOS[produto]}`;
/* v3.72: a desistência em 7 dias (CDC, art. 49) e o que conta como pago no Asaas */
const PRAZO_DESISTE = 7;
const PAGO = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'];
const DEVOLVIDO = ['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'];
/* o dia em que a pessoa pagou (o cartão aprovado conta: é ali que o dinheiro sai dela) */
const diaPago = (p: any) => String(p?.clientPaymentDate || p?.paymentDate || p?.confirmedDate || p?.dueDate || '').slice(0, 10);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const maisDias = (dia: string, n: number) => new Date(Date.parse(dia + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const agora = () => new Date().toISOString();
/* o dia de hoje em Brasília (AAAA-MM-DD) e somar meses sem pular o fim do mês (31/01 + 1 mês = 28/02) */
const hojeBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
function maisUmMes(dia: string) {
  const [a, m, d] = dia.split('-').map(Number), alvo = new Date(Date.UTC(a, m, 1)), ult = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ult)); return alvo.toISOString().slice(0, 10);
}
/* CPF (11) e CNPJ (14): só números e os dígitos verificadores certos */
function docOk(v: string) {
  const s = String(v || '').replace(/\D/g, '');
  if (!/^(\d{11}|\d{14})$/.test(s) || /^(\d)\1+$/.test(s)) return '';
  const dv = (base: string, pesos: number[]) => { const r = pesos.reduce((t, p, i) => t + Number(base[i]) * p, 0) % 11; return r < 2 ? 0 : 11 - r; };
  if (s.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2], p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    return dv(s, p1) === Number(s[9]) && dv(s, p2) === Number(s[10]) ? s : '';
  }
  const q1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], q2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return dv(s, q1) === Number(s[12]) && dv(s, q2) === Number(s[13]) ? s : '';
}
/* comparar o token do aviso sem dar pista pelo tempo */
function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0;
}

/* o Asaas: devolve o JSON ou joga { status, msg } com a primeira mensagem de erro dele */
async function asaas(caminho: string, metodo = 'GET', corpo?: unknown) {
  const r = await fetch(ASAAS() + caminho, {
    method: metodo,
    headers: { access_token: env('ASAAS_API_KEY'), 'Content-Type': 'application/json', 'User-Agent': 'Corre (app.corresocial.com)' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const o: any = await r.json().catch(() => null);
  if (!r.ok) throw { status: r.status, msg: String(o?.errors?.[0]?.description || `Asaas respondeu ${r.status}`).slice(0, 300) };
  return o;
}
/* a fatura em aberto mais antiga da assinatura (a que a pessoa tem que pagar agora) */
async function faturaAberta(sub: string) {
  const o = await asaas(`/subscriptions/${encodeURIComponent(sub)}/payments?limit=20`);
  const L = (o?.data || []).filter((p: any) => ['PENDING', 'OVERDUE'].includes(p.status)).sort((a: any, b: any) => String(a.dueDate).localeCompare(String(b.dueDate)));
  return L[0] ? { link: String(L[0].invoiceUrl || ''), vence: String(L[0].dueDate || '') } : null;
}

/* v3.61: confere direto no Asaas o que já foi pago. É a rede de segurança do aviso: se ele não chegou (fila do webhook
   pausada, chave trocada antes de religar), quem pagou não fica travado; o app chama ao abrir os Planos */
async function confere(admin: any, a: any) {
  const o = await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}/payments?limit=50`);
  const pagos = (o?.data || []).filter((p: any) => ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(p.status))
    .sort((x: any, y: any) => String(y.dueDate).localeCompare(String(x.dueDate)));
  if (!pagos.length) return false;
  const ate = maisUmMes(String(pagos[0].dueDate).slice(0, 10));
  if (a.pago_ate && a.pago_ate >= ate) return false;
  const muda: Record<string, unknown> = { pago_ate: ate, status: a.status === 'cancelada' ? 'cancelada' : 'ativa', link: '', updated_at: agora() };
  if (a.produto === 'studio') muda.nivel = nivelDoValor(Number(pagos[0].value), a.nivel);
  const { error } = await admin.from('corre_assinaturas').update(muda).eq('id', a.id);
  return !error;
}

/* o cliente da pessoa no Asaas: o que já existe, ou um novo (a primeira vez, com nome e CPF/CNPJ; o documento vai só pro
   Asaas). Devolve o id, ou a resposta de erro pronta. v4.13: as skins usam o mesmo */
async function clienteDe(admin: any, user: any, body: any): Promise<string | Response> {
  const { data: cl } = await admin.from('corre_asaas_clientes').select('cliente').eq('dono', user.id).maybeSingle();
  if (cl?.cliente) return String(cl.cliente);
  const nome = String(body?.nome || '').replace(/\s+/g, ' ').trim().slice(0, 100), doc = docOk(body?.doc);
  if (nome.length < 3) return json({ erro: 'nome' }, 400);
  if (!doc) return json({ erro: 'doc' }, 400);
  const c = await asaas('/customers', 'POST', { name: nome, cpfCnpj: doc, email: user.email || undefined, externalReference: user.id, notificationDisabled: false });
  const cliente = String(c.id || '');
  if (!cliente) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu o cliente.' }, 502);
  await admin.from('corre_asaas_clientes').upsert({ dono: user.id, cliente });
  return cliente;
}

/* v3.72: anota o aceite dos Termos (a versão, o plano, o valor e a hora: a prova do combinado). Sem o delta-v372.sql a
   tabela não existe: avisa no log e a assinatura segue */
async function anotaAceite(admin: any, dono: string, versao: string, produto: string, nivel: number, valor: number, acao: string) {
  const { error } = await admin.from('corre_termos_aceites').insert({ dono, versao, produto, nivel: produto === 'studio' ? nivel : 1, valor, acao });
  if (error) console.warn('aceite:', error.message);
}

/* ---------- o aviso do Asaas ---------- */
async function aviso(req: Request, admin: any) {
  const tok = await tokenAviso();
  if (!tok || !igual(req.headers.get('asaas-access-token') || '', tok)) return json({ erro: 'token' }, 401);
  let ev: any = null; try { ev = await req.json(); } catch (_) { return json({ erro: 'corpo' }, 400); }
  const tipo = String(ev?.event || '');
  if (!tipo) return json({ ok: true, ignorado: 'sem evento' });
  /* v3.61: aviso sem "id" (formato antigo do Asaas) não pode ser jogado fora, senão quem pagou fica sem o plano:
     a chave vira o evento + a cobrança + a situação dela */
  const id = String(ev?.id || `${tipo}:${ev?.payment?.id || ev?.subscription?.id || ''}:${ev?.payment?.status || ''}`).slice(0, 200);
  const { data: ja } = await admin.from('corre_asaas_eventos').select('id').eq('id', id).maybeSingle();
  if (ja) return json({ ok: true, repetido: true });
  const pg = ev.payment || null, subId = String(pg?.subscription || ev.subscription?.id || '');
  /* v4.13: a cobrança avulsa de uma skin (externalReference "skin:dono:skin"): pagou, libera; o dinheiro voltou, tira;
     venceu sem pagar, cancela. Erro no banco devolve 500 pro Asaas mandar de novo */
  if (pg?.id && !subId && /^skin:/.test(String(pg.externalReference || ''))) {
    const f: [string, Record<string, unknown>] | null = tipo === 'PAYMENT_CONFIRMED' || tipo === 'PAYMENT_RECEIVED' ? ['corre_skin_paga', { p_cobranca: String(pg.id), p_valor: Number(pg.value) || 0 }]
      : ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(tipo) ? ['corre_skin_volta', { p_cobranca: String(pg.id), p_desistiu: false }]
      : tipo === 'PAYMENT_OVERDUE' || tipo === 'PAYMENT_DELETED' ? ['corre_skin_cai', { p_cobranca: String(pg.id) }] : null;
    if (f) { const { error } = await admin.rpc(f[0], f[1]); if (error) { console.error('aviso/skin:', error.message); return json({ erro: 'banco' }, 500); } }
  }
  /* aviso de cobrança avulsa ou de assinatura que não é do Corre: anota e segue (o Asaas não pode travar a fila) */
  const { data: a } = subId ? await admin.from('corre_assinaturas').select('*').eq('asaas_assinatura', subId).maybeSingle() : { data: null };
  if (a) {
    const muda: Record<string, unknown> = { updated_at: agora() };
    if (tipo === 'PAYMENT_CONFIRMED' || tipo === 'PAYMENT_RECEIVED') {
      /* pagou: cobre até um mês depois do vencimento da fatura (nunca encurta o que já tinha) */
      const ate = maisUmMes(String(pg.dueDate || hojeBR()).slice(0, 10));
      muda.status = 'ativa'; muda.pago_ate = !a.pago_ate || a.pago_ate < ate ? ate : a.pago_ate; muda.link = '';
      if (a.produto === 'studio' && Number(pg?.value) > 0) muda.nivel = nivelDoValor(Number(pg.value), a.nivel);
    } else if (tipo === 'PAYMENT_CREATED' || tipo === 'PAYMENT_UPDATED') {
      if (pg?.invoiceUrl && ['PENDING', 'OVERDUE'].includes(pg.status)) muda.link = String(pg.invoiceUrl);
    } else if (tipo === 'PAYMENT_OVERDUE') {
      muda.status = a.status === 'cancelada' ? 'cancelada' : 'atrasada'; if (pg?.invoiceUrl) muda.link = String(pg.invoiceUrl);
    } else if (tipo === 'PAYMENT_REFUNDED' || tipo === 'PAYMENT_CHARGEBACK_REQUESTED' || tipo === 'PAYMENT_CHARGEBACK_DISPUTE') {
      /* devolveu o dinheiro: o período pago acaba hoje (v3.72: cancelada segue cancelada; a desistência cancela antes
         de o aviso do estorno chegar, e "atrasada" mostraria uma fatura pra pagar) */
      muda.status = a.status === 'cancelada' ? 'cancelada' : 'atrasada'; muda.pago_ate = new Date(Date.now() - 3 * 3600e3 - 4 * 864e5).toISOString().slice(0, 10);
    } else if (tipo === 'SUBSCRIPTION_DELETED' || tipo === 'SUBSCRIPTION_INACTIVATED') {
      muda.status = 'cancelada'; muda.link = '';
    }
    const { error } = await admin.from('corre_assinaturas').update(muda).eq('id', a.id);
    if (error) { console.error('aviso/banco:', error.message); return json({ erro: 'banco' }, 500); }
  }
  await admin.from('corre_asaas_eventos').insert({ id, tipo: tipo.slice(0, 60) });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const SB_URL = env('SUPABASE_URL'), SB_ANON = env('SUPABASE_ANON_KEY'), SB_SERV = env('SUPABASE_SERVICE_ROLE_KEY');
  const admin = SB_SERV ? createClient(SB_URL, SB_SERV, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  if (!admin) return json({ erro: 'config' }, 503);

  if (new URL(req.url).searchParams.get('asaas') === 'aviso') return await aviso(req, admin);

  /* ---------- daqui pra baixo, precisa do login do app ---------- */
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ erro: 'login' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u } = await sb.auth.getUser(jwt);
  const user = u && u.user;
  if (!user) return json({ erro: 'login' }, 401);
  let body: any = null;
  try { body = await req.json(); } catch (_) { return json({ erro: 'corpo' }, 400); }
  const acao = String(body?.acao || ''), produto = String(body?.produto || '');
  if (acao === 'asaas') return await ligaAsaas(user, SB_URL);
  if (acao.startsWith('skin-')) { if (!env('ASAAS_API_KEY')) return json({ erro: 'config' }, 503); return await skin(acao, body, user, admin); }
  if (!PRODUTOS[produto]) return json({ erro: 'produto' }, 400);
  if (!env('ASAAS_API_KEY')) return json({ erro: 'config' }, 503);
  const { data: a } = await admin.from('corre_assinaturas').select('*').eq('dono', user.id).eq('produto', produto).maybeSingle();

  try {
    if (acao === 'link') {
      if (!a?.asaas_assinatura) return json({ erro: 'sem_assinatura' }, 404);
      const f = await faturaAberta(a.asaas_assinatura);
      if (f?.link && f.link !== a.link) await admin.from('corre_assinaturas').update({ link: f.link, updated_at: agora() }).eq('id', a.id);
      return json({ ok: true, link: f?.link || '', vence: f?.vence || '' });
    }

    if (acao === 'confere') {
      if (!a?.asaas_assinatura) return json({ ok: true, ativou: false });
      return json({ ok: true, ativou: await confere(admin, a) });
    }

    if (acao === 'cancelar') {
      if (!a?.asaas_assinatura || a.status === 'cancelada') return json({ ok: true, ja: true });
      await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'DELETE').catch((e: any) => { if (e?.status !== 404) throw e; });
      await admin.from('corre_assinaturas').update({ status: 'cancelada', link: '', updated_at: agora() }).eq('id', a.id);
      return json({ ok: true, pago_ate: a.pago_ate, teste_ate: a.teste_ate });
    }

    if (acao === 'desistir') {
      const nao = (motivo: string) => json({ ok: true, pode: false, motivo });
      if (!a?.asaas_assinatura) return nao('sem_pagamento');
      if (a.desistiu_em) return nao('ja');
      /* pela lista de cobranças (e não pela da assinatura): quem cancelou antes de desistir também acha o pagamento */
      const o = await asaas(`/payments?subscription=${encodeURIComponent(a.asaas_assinatura)}&limit=50`);
      const L = o?.data || [];
      if (L.some((p: any) => DEVOLVIDO.includes(p.status))) return nao('devolvido');
      const pagos = L.filter((p: any) => PAGO.includes(p.status)).sort((x: any, y: any) => diaPago(x).localeCompare(diaPago(y)));
      if (!pagos.length) return nao('sem_pagamento');
      const p = pagos[0], dia = diaPago(p), ate = maisDias(dia, PRAZO_DESISTE);
      /* só o primeiro pagamento de cada assinatura: renovou, os 7 dias já passaram */
      if (pagos.length > 1 || hojeBR() > ate) return nao('prazo');
      const valor = Number(p.value) || 0, boleto = String(p.billingType || '') === 'BOLETO';
      if (body?.ver) return json({ ok: true, pode: true, valor, pago_em: dia, ate, boleto });
      /* primeiro o dinheiro: se o Asaas recusar o estorno, nada muda (dá pra tentar de novo, ou escrever pro e-mail) */
      let link = '';
      if (boleto) {
        /* boleto não volta sozinho: o Asaas dá um link pra pessoa dizer a conta onde recebe */
        const r = await asaas(`/payments/${encodeURIComponent(p.id)}/bankSlip/refund`, 'POST', {});
        link = String(r?.requestUrl || r?.url || r?.link || '');
      } else await asaas(`/payments/${encodeURIComponent(p.id)}/refund`, 'POST', { description: 'Desistência em 7 dias (CDC, art. 49)' });
      /* depois, nada mais é cobrado: a assinatura sai do Asaas e o plano para hoje (sem os 3 dias de folga) */
      await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'DELETE').catch((e: any) => { if (e?.status !== 404) console.error('desistir/cancelar:', e?.status, e?.msg); });
      const fim = new Date(Date.now() - 3 * 3600e3 - 4 * 864e5).toISOString().slice(0, 10);
      const { error } = await admin.from('corre_assinaturas').update({ status: 'cancelada', pago_ate: fim, link: '', updated_at: agora() }).eq('id', a.id);
      if (error) console.error('desistir/banco:', error.message);
      /* a marca de "já desistiu" vai à parte: sem o delta-v372.sql a coluna não existe, e o resto não pode cair junto */
      const { error: e2 } = await admin.from('corre_assinaturas').update({ desistiu_em: agora() }).eq('id', a.id);
      if (e2) console.warn('desistir: sem a coluna desistiu_em (falta o delta-v372.sql):', e2.message);
      return json({ ok: true, devolvido: valor, boleto, link });
    }

    if (acao !== 'assinar') return json({ erro: 'acao' }, 400);
    /* v3.72: sem o "Li e aceito os Termos de uso" não tem assinatura (o app manda a versão que a pessoa viu) */
    const termos = String(body?.termos || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(termos)) return json({ erro: 'termos' }, 400);
    const nivel = produto === 'studio' ? Math.max(2, Math.min(4, Math.round(Number(body?.nivel) || 2))) : 1;
    const valor = preco(produto, nivel);

    /* já assinou e segue valendo: no Studio, outro nível troca o valor; senão, devolve a fatura em aberto */
    if (a?.asaas_assinatura && a.status !== 'cancelada') {
      /* troca quando o preço pedido é outro que o da assinatura (o nível pago só muda quando a fatura nova é paga) */
      const trocou = produto === 'studio' && Math.abs(valor - Number(a.valor || 0)) > 0.001;
      if (trocou) {
        const corpo = { value: valor, description: descricao(produto, nivel), updatePendingPayments: true };
        await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'PUT', corpo)
          .catch((e: any) => (e?.status === 404 || e?.status === 405 ? asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'POST', corpo) : Promise.reject(e)));
      }
      const f = await faturaAberta(a.asaas_assinatura).catch(() => null);
      /* o nível fica o que foi pago; o aviso da próxima fatura paga (já com o valor novo) é que troca */
      await admin.from('corre_assinaturas').update({ valor, link: f?.link || a.link || '', updated_at: agora() }).eq('id', a.id);
      if (trocou) await anotaAceite(admin, user.id, termos, produto, nivel, valor, 'trocar');
      return json({ ok: true, link: f?.link || '', trocou, nivel_pago: a.nivel });
    }

    /* o cliente no Asaas (a primeira vez: nome e CPF/CNPJ) */
    const cliente = await clienteDe(admin, user, body);
    if (cliente instanceof Response) return cliente;

    /* a assinatura: no teste grátis, a primeira cobrança vence no último dia do teste */
    const noTeste = !!(a?.teste_ate && Date.parse(a.teste_ate) > Date.now());
    /* v3.61: quem cancelou e assina de novo ainda no período pago só paga quando ele acaba (antes vencia hoje: pagava dobrado) */
    const pagoAte = a?.pago_ate && a.pago_ate > hojeBR() ? String(a.pago_ate) : '';
    const vence = noTeste ? new Date(Date.parse(a.teste_ate) - 3 * 3600e3).toISOString().slice(0, 10) : pagoAte || hojeBR();
    const s = await asaas('/subscriptions', 'POST', {
      customer: cliente, billingType: 'UNDEFINED', value: valor, nextDueDate: vence < hojeBR() ? hojeBR() : vence, cycle: 'MONTHLY',
      description: descricao(produto, nivel), externalReference: `${user.id}:${produto}`,
    });
    const sub = String(s.id || ''); if (!sub) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu a assinatura.' }, 502);
    const f = await faturaAberta(sub).catch(() => null);
    const linha = { dono: user.id, produto, nivel: pagoAte && a ? a.nivel : nivel, valor, status: noTeste ? 'teste' : pagoAte ? 'ativa' : 'pendente', asaas_assinatura: sub, link: f?.link || '', updated_at: agora() };
    const { error } = a ? await admin.from('corre_assinaturas').update(linha).eq('id', a.id) : await admin.from('corre_assinaturas').insert(linha);
    if (error) {
      /* v3.61: o banco não guardou (dois toques ao mesmo tempo, por exemplo): a assinatura que acabou de nascer no Asaas
         sai, senão ela cobraria a pessoa sem o Corre saber */
      console.error('assinar/banco:', error.message);
      await asaas(`/subscriptions/${encodeURIComponent(sub)}`, 'DELETE').catch(() => null);
      return json({ erro: 'banco' }, 500);
    }
    await anotaAceite(admin, user.id, termos, produto, nivel, valor, 'assinar');
    return json({ ok: true, link: f?.link || '', vence, teste: noTeste });
  } catch (e: any) {
    if (e && e.msg) { console.error('asaas:', e.status, e.msg); return json({ erro: 'asaas', detalhe: e.msg }, 502); }
    console.error('pagamento:', e?.message || e); return json({ erro: 'rede' }, 502);
  }
});

/* ---------- v4.13 · as skins de Halloween em real ----------
   O Thales: "quero que você adicione valor de real de verdade nas novas skins de Halloween". As 8 da coleção saem do
   correal e passam a ser vendidas só em real, pagamento único (não renova), no Pix ou no cartão (boleto fica de fora:
   leva dias pra cair, e a devolução dele pede a conta da pessoa). O preço mora no banco (corre_skin_real,
   delta-v413.sql); aqui só o nome que vai na fatura. O correal continua não sendo dinheiro: real nunca vira correal.
     acao "skin-comprar" { skin, forma: pix|cartao, termos, nome?, doc? }: na época (1º/10 até Finados), cria a cobrança
       avulsa e devolve o link da fatura. Já tem a skin: não cobra. Tem uma esperando pagamento na mesma forma: devolve a
       mesma fatura; noutra forma, apaga a de antes no Asaas (e se ela já foi paga, libera em vez de cobrar de novo).
     acao "skin-confere": olha no Asaas as que esperam pagamento (se o aviso não chegou, a skin chega assim).
     acao "skin-desistir" { pedido, ver? }: até 7 dias do pagamento (CDC, art. 49), devolve o dinheiro e a skin sai. Uma
       vez por compra; com "ver", só diz se pode e quanto volta.
   O aviso do Asaas (?asaas=aviso) libera quando paga e tira quando o dinheiro volta (externalReference "skin:"). */
const SKIN_NOME: Record<string, string> = { abobora: 'Cabeça de Abóbora', saci: 'Saci', bruxa: 'Bruxa do Caldeirão', esqueleto: 'Esqueleto',
  lobisomem: 'Lobisomem do Tibagi', lencol: 'Fantasma de Lençol', mortovivo: 'Morto-Vivo', gatopreto: 'Gato Preto' };
/* a coleção de Halloween só vende na época dela: de 1º/10 até Finados (2/11), no dia de Brasília */
const epocaHalloween = () => { const md = hojeBR().slice(5); return md >= '10-01' && md <= '11-02'; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* chama uma função do banco (as do delta-v413.sql, só do servidor); erro vira { banco } */
async function rpc(admin: any, f: string, a: Record<string, unknown>) {
  const { data, error } = await admin.rpc(f, a);
  if (error) throw { banco: error.message };
  return data;
}
async function skin(acao: string, body: any, user: any, admin: any) {
  try {
    if (acao === 'skin-confere') {
      const L = (await rpc(admin, 'corre_skin_abertos', { p_dono: user.id })) || [], pagas: string[] = [];
      for (const p of L) {
        const c = await asaas(`/payments/${encodeURIComponent(p.cobranca)}`).catch(() => null);
        if (!c) continue;
        if (PAGO.includes(c.status)) { const r = await rpc(admin, 'corre_skin_paga', { p_cobranca: p.cobranca, p_valor: Number(c.value) || 0 }); if (r?.ok && !r.ja) pagas.push(p.skin); }
        else if (DEVOLVIDO.includes(c.status)) await rpc(admin, 'corre_skin_volta', { p_cobranca: p.cobranca, p_desistiu: false });
        else if (c.deleted) await rpc(admin, 'corre_skin_cai', { p_cobranca: p.cobranca });
      }
      return json({ ok: true, pagas });
    }

    if (acao === 'skin-desistir') {
      const nao = (motivo: string) => json({ ok: true, pode: false, motivo });
      const id = String(body?.pedido || '');
      if (!UUID.test(id)) return json({ erro: 'pedido' }, 400);
      const p = await rpc(admin, 'corre_skin_pedido_ver', { p_dono: user.id, p_id: id });
      if (!p || p.status !== 'paga') return nao(p?.status === 'estornada' ? 'devolvido' : 'sem_pagamento');
      if (p.desistiu_em) return nao('ja');
      const c = await asaas(`/payments/${encodeURIComponent(p.asaas_cobranca)}`);
      if (DEVOLVIDO.includes(c?.status)) return nao('devolvido');
      if (!PAGO.includes(c?.status)) return nao('sem_pagamento');
      const dia = diaPago(c), ate = maisDias(dia, PRAZO_DESISTE), valor = Number(c.value) || Number(p.valor) || 0;
      if (hojeBR() > ate) return nao('prazo');
      if (body?.ver) return json({ ok: true, pode: true, valor, pago_em: dia, ate });
      /* primeiro o dinheiro (se o Asaas recusar, nada muda); depois a skin sai. O aviso do estorno chega depois e não
         muda mais nada */
      await asaas(`/payments/${encodeURIComponent(p.asaas_cobranca)}/refund`, 'POST', { description: 'Desistência em 7 dias (CDC, art. 49)' });
      const { error } = await admin.rpc('corre_skin_volta', { p_cobranca: p.asaas_cobranca, p_desistiu: true });
      if (error) console.error('skin-desistir/banco:', error.message);
      return json({ ok: true, devolvido: valor, skin: p.skin });
    }

    if (acao !== 'skin-comprar') return json({ erro: 'acao' }, 400);
    const termos = String(body?.termos || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(termos)) return json({ erro: 'termos' }, 400);
    const k = String(body?.skin || ''), forma = String(body?.forma || '');
    if (!SKIN_NOME[k]) return json({ erro: 'skin' }, 400);
    if (forma !== 'pix' && forma !== 'cartao') return json({ erro: 'forma' }, 400);
    if (!epocaHalloween()) return json({ erro: 'epoca' }, 409);
    const pode = await rpc(admin, 'corre_skin_pode', { p_dono: user.id, p_skin: k });
    const valor = Number(pode?.real) || 0;
    if (!(valor > 0)) return json({ erro: 'skin' }, 400);
    if (pode.ja) return json({ ok: true, ja: true });
    /* uma fatura em aberto por skin: a mesma forma devolve a mesma fatura; outra forma apaga a de antes */
    const pend = pode.pendente;
    if (pend?.cobranca) {
      const c = await asaas(`/payments/${encodeURIComponent(pend.cobranca)}`).catch(() => null);
      if (c && PAGO.includes(c.status)) { await rpc(admin, 'corre_skin_paga', { p_cobranca: pend.cobranca, p_valor: Number(c.value) || 0 }); return json({ ok: true, ja: true, pagou: true }); }
      if (c && !c.deleted && c.status === 'PENDING' && pend.forma === forma && pend.link) return json({ ok: true, link: pend.link, pedido: pend.id, valor, mesma: true });
      if (c && !c.deleted && ['PENDING', 'OVERDUE'].includes(c.status)) await asaas(`/payments/${encodeURIComponent(pend.cobranca)}`, 'DELETE').catch((e: any) => { if (e?.status !== 404) throw e; });
    }
    const cliente = await clienteDe(admin, user, body);
    if (cliente instanceof Response) return cliente;
    const pg = await asaas('/payments', 'POST', {
      customer: cliente, billingType: forma === 'pix' ? 'PIX' : 'CREDIT_CARD', value: valor, dueDate: maisDias(hojeBR(), 1),
      description: `Corre · Skin ${SKIN_NOME[k]} do Correverso. Pagamento único.`, externalReference: `skin:${user.id}:${k}`,
    });
    const cob = String(pg?.id || '');
    if (!cob) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu a cobrança.' }, 502);
    const link = String(pg.invoiceUrl || '');
    const { data: r, error } = await admin.rpc('corre_skin_pedido_novo', { p_dono: user.id, p_skin: k, p_forma: forma, p_cobranca: cob, p_link: link, p_termos: termos });
    if (error || !r?.ok) {
      /* o banco não guardou: a cobrança que acabou de nascer sai do Asaas, senão ela ficaria sem dono no Corre */
      console.error('skin/banco:', error?.message || r?.motivo);
      await asaas(`/payments/${encodeURIComponent(cob)}`, 'DELETE').catch(() => null);
      return json({ erro: 'banco' }, 500);
    }
    return json({ ok: true, link, pedido: r.id, valor });
  } catch (e: any) {
    if (e && e.banco) { console.error('skin/banco:', e.banco); return json({ erro: 'banco' }, 503); }
    if (e && e.msg) { console.error('asaas/skin:', e.status, e.msg); return json({ erro: 'asaas', detalhe: e.msg }, 502); }
    console.error('skin:', e?.message || e); return json({ erro: 'rede' }, 502);
  }
}

/* ---------- o fundador liga o Asaas: confere a chave e deixa o webhook cadastrado, com o token certo ---------- */
async function ligaAsaas(user: any, SB_URL: string) {
  if (user.id !== FUNDADOR) return json({ erro: 'fundador' }, 403);
  const amb = sandbox() ? 'sandbox' : 'producao';
  if (!env('ASAAS_API_KEY')) return json({ erro: 'config', ambiente: amb }, 503);
  const url = SB_URL.replace(/\/+$/, '') + '/functions/v1/pagamento?asaas=aviso';
  try {
    await asaas('/customers?limit=1');
    const L = await asaas('/webhooks?limit=50');
    const ja = (L?.data || []).find((w: any) => String(w.url || '') === url);
    const corpo = { name: 'Corre', url, email: env('ASAAS_EMAIL', 'contato@houzirecords.com.br'), enabled: true, interrupted: false,
      apiVersion: 3, authToken: await tokenAviso(), sendType: 'SEQUENTIALLY', events: EVENTOS };
    if (ja?.id) await asaas(`/webhooks/${encodeURIComponent(ja.id)}`, 'PUT', corpo);
    else await asaas('/webhooks', 'POST', corpo);
    return json({ ok: true, ambiente: amb, webhook: ja?.id ? 'atualizado' : 'criado' });
  } catch (e: any) {
    if (e && e.msg) { console.error('asaas/ligar:', e.status, e.msg); return json({ erro: 'asaas', detalhe: e.msg, ambiente: amb }, 502); }
    return json({ erro: 'rede', ambiente: amb }, 502);
  }
}
