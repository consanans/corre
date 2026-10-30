// CORRE · função "pagamento" (v3.60): os planos, cobrados pelo Asaas.
//
// Os planos (o Thales, 16/10/2026): Studio por redes sociais (1 de graça; 2 = R$ 59,90; 3 = R$ 69,90; 4 ou mais =
// R$ 79,90), Studio Houzi R$ 29,90 e Hórus R$ 9,90 por mês, esses dois com 30 dias de graça (v5.05: no Studio Houzi,
// no lugar dos 30 dias, a primeira marca é de graça e o plano é da segunda em diante; quem diz é o banco). O preço mora
// AQUI (o app só mostra); a pessoa nunca escolhe o valor.
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
//  8. v5.09: o Muralzim, o ingresso vendido de verdade com a divisão do Asaas (a parte do organizador cai na conta Asaas
//     dele, a taxa do Corre fica na Houzi). acao "org-conta", "org-carteira", "org-ver", "ingresso-comprar",
//     "ingresso-pix", "ingresso-confere", "ingresso-desistir" e "evento-cancelar" (ver o bloco do Muralzim).
//
// Segredos (Supabase > Edge Functions > Secrets):
//   ASAAS_API_KEY        a chave da API do Asaas (Asaas > Integrações > Chave de API). É o único obrigatório.
//   ASAAS_AMBIENTE       opcional: "sandbox" ou "producao". Sem ele, vale o que a chave diz ($aact_hmlg_ é o sandbox)
//   ASAAS_WEBHOOK_TOKEN  opcional: o token do aviso. Sem ele, sai da própria chave (HMAC), sempre igual pra mesma chave
//   ASAAS_COFRE          opcional (v5.09): a chave que cifra a chave da subconta de cada organizador. Sem ela, vale a
//                        IG_CHAVE (a mesma do cofre do Instagram) ou uma derivada da chave de serviço. Não trocar depois:
//                        as chaves guardadas param de abrir (o organizador segue vendendo; só a conferência da situação
//                        da conta dele no Asaas deixa de funcionar)
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
const PRODUTOS: Record<string, string> = { studio: 'Studio Cria', houzi: 'Studio Houzi', horus: 'Hórus' };
/* o preço de cada plano (o Studio pelo nível: quantas redes) */
/* v5.10 · o Studio por rede (o Thales, 30/10/2026): R$ 59,90 com 2 redes, R$ 10 por rede a mais até a 20ª e R$ 5 da 21ª
   em diante, até 100 (antes: 2, 3 e "4 ou mais" a 79,90, que pra quem toca 30 clientes saía de graça) */
const REDES_MAX = 100;
const precoStudio = (n: number) => {
  n = Math.max(2, Math.min(REDES_MAX, Math.round(n) || 2));
  return Math.round((59.9 + 10 * (Math.min(n, 20) - 2) + 5 * Math.max(0, n - 20)) * 100) / 100;
};
const preco = (produto: string, nivel: number) =>
  produto === 'houzi' ? 29.9 : produto === 'horus' ? 9.9 : nivel >= 2 ? precoStudio(nivel) : 0;
/* v3.61: o nível do Studio que vale é o do valor que foi PAGO (trocar de plano só libera mais redes quando a fatura
   com o valor novo é paga; antes, subir pro "4 ou mais" liberava na hora e dava pra voltar sem pagar) */
const nivelDoValor = (v: number, antes: number) => v < 59.89 ? antes
  : v >= 239.89 ? Math.min(REDES_MAX, 20 + Math.floor((v - 239.9 + 0.02) / 5)) : 2 + Math.floor((v - 59.9 + 0.02) / 10);
const descricao = (produto: string, nivel: number) =>
  produto === 'studio' ? `Corre · Studio Cria, ${nivel} redes sociais` : `Corre · ${PRODUTOS[produto]}`;
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
  /* v5.09: o ingresso do Muralzim (externalReference "ing:pedido"): pagou, os ingressos valem (ou, se o lugar acabou
     ou o evento foi cancelado, o dinheiro volta); o dinheiro voltou, deixam de valer; venceu sem pagar, os lugares voltam */
  if (pg?.id && !subId && /^ing:/.test(String(pg.externalReference || ''))) {
    try {
      if (tipo === 'PAYMENT_CONFIRMED' || tipo === 'PAYMENT_RECEIVED') await pagouIngresso(admin, String(pg.id), Number(pg.value) || 0);
      else if (['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(tipo)) await rpc(admin, 'corre_ingresso_volta', { p_cobranca: String(pg.id), p_desistiu: false });
      else if (tipo === 'PAYMENT_OVERDUE' || tipo === 'PAYMENT_DELETED') await rpc(admin, 'corre_ingresso_cai', { p_pedido: null, p_cobranca: String(pg.id) });
    } catch (e: any) { console.error('aviso/ingresso:', e?.banco || e?.msg || e); return json({ erro: 'banco' }, 500); }
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
  /* v5.09: o Muralzim (a conta de recebimento de quem vende e o ingresso) */
  if (acao.startsWith('org-') || acao.startsWith('ingresso-') || acao === 'evento-cancelar') {
    if (!env('ASAAS_API_KEY')) return json({ erro: 'config' }, 503);
    return await muralzim(acao, body, user, admin);
  }
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
    const nivel = produto === 'studio' ? Math.max(2, Math.min(REDES_MAX, Math.round(Number(body?.nivel) || 2))) : 1;
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
     acao "skin-comprar" { skin, forma: pix|cartao, termos, nome?, doc? }: na época da coleção, cria a cobrança
       avulsa e devolve o link da fatura. Já tem a skin: não cobra. Tem uma esperando pagamento na mesma forma: devolve a
       mesma fatura; noutra forma, apaga a de antes no Asaas (e se ela já foi paga, libera em vez de cobrar de novo).
     acao "skin-confere": olha no Asaas as que esperam pagamento (se o aviso não chegou, a skin chega assim).
     acao "skin-desistir" { pedido, ver? }: até 7 dias do pagamento (CDC, art. 49), devolve o dinheiro e a skin sai. Uma
       vez por compra; com "ver", só diz se pode e quanto volta.
   O aviso do Asaas (?asaas=aviso) libera quando paga e tira quando o dinheiro volta (externalReference "skin:"). */
const SKIN_NOME: Record<string, string> = { abobora: 'Cabeça de Abóbora', saci: 'Saci', bruxa: 'Bruxa do Caldeirão', esqueleto: 'Esqueleto',
  lobisomem: 'Lobisomem do Tibagi', lencol: 'Fantasma de Lençol', mortovivo: 'Morto-Vivo', gatopreto: 'Gato Preto',
  /* v5.05: a coleção de Natal (o Thales: "adiciona um monte de natal e tudo acima de 10 reais"; o preço mora no banco) */
  noel: 'Papai Noel', arvore: 'Árvore Dourada', noelverao: 'Noel de Bermuda', mamaenoel: 'Mamãe Noel', boneconeve: 'Boneco de Neve',
  quebranozes: 'Quebra-Nozes', piscapisca: 'Pisca-Pisca', rena: 'Rena', duende: 'Duende da Fábrica', reimago: 'Rei Mago',
  biscoito: 'Boneco de Gengibre', presente: 'Presente',
  /* v5.08: o Midas, o super avatar de ouro (o Thales: "faz um super avatar de ouro e colocar 129,99 e valor") */
  midas: 'Midas, o avatar de ouro' };
/* cada coleção só vende na época dela, no dia de Brasília: o Halloween de 1º/10 até Finados (2/11) e o Natal de 15/10
   até o Dia de Reis (6/1), o mesmo calendário da decoração da cidade */
const NATAL = new Set(['noel', 'arvore', 'noelverao', 'mamaenoel', 'boneconeve', 'quebranozes', 'piscapisca', 'rena', 'duende', 'reimago', 'biscoito', 'presente']);
/* v5.08: a edição de ouro não é de época: fica à venda o ano inteiro */
const SEMPRE = new Set(['midas']);
const naEpoca = (k: string) => {
  if (SEMPRE.has(k)) return true;
  const md = hojeBR().slice(5);
  return NATAL.has(k) ? (md >= '10-15' || md <= '01-06') : (md >= '10-01' && md <= '11-02');
};
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
    if (!naEpoca(k)) return json({ erro: 'epoca' }, 409);
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

/* ---------- v5.09 · o Muralzim: o ingresso vendido de verdade ----------
   O Thales: "o muralzim de verdade deve cobrar através da chave do asaas de verdade". Escolheu: o Asaas divide na hora (a
   parte do organizador cai na conta Asaas dele, pelo split com valor fixo, e a taxa do Corre fica na Houzi; a Houzi só
   fatura a taxa) e o Corre fica com 10% pago por quem compra, no mínimo R$ 2 por ingresso (a conta mora no banco:
   corre_ing_taxa). As taxas do Asaas saem da parte do Corre: o organizador recebe o preço do ingresso inteiro.
     A conta de recebimento de quem vende:
       acao "org-conta" { tipo: pf|pj, nome, email, doc, nascimento?, empresa?, celular, cep, endereco, numero,
         complemento?, bairro, renda, termos }: abre a subconta no Asaas (POST /accounts; só conta-mãe com CNPJ abre, e a
         Houzi tem). O Asaas manda um e-mail pra pessoa criar a senha e pede os documentos; até aprovar, não vende. A
         chave da subconta volta só nessa hora: vai cifrada pro banco (o app nunca vê) e serve pra conferir a situação.
       acao "org-carteira" { wallet, termos }: quem já tem conta no Asaas cola o Wallet ID (Asaas › Integrações). Vale na
         hora; se o código não for de uma carteira de verdade, o Asaas recusa a primeira venda e a pessoa arruma.
       acao "org-ver": a situação (de minuto em minuto no máximo, pela chave da subconta: aprovada, em análise, pendente
         com o link pra mandar os documentos, recusada).
     O ingresso:
       acao "ingresso-comprar" { evento, itens: [{ lote, qtd }], forma: pix|cartao, termos, portador?, nome?, doc? }: o
         banco reserva os lugares por 20 minutos e diz os valores; aqui a cobrança nasce com o split. No Pix, o QR e o
         copia e cola voltam pro app (paga sem sair do Corre); no cartão, o link da fatura.
       acao "ingresso-pix" { pedido }: o QR de novo. acao "ingresso-confere": olha as que esperam pagamento (se o aviso
         não chegou, o ingresso chega assim).
       acao "ingresso-desistir" { pedido, ver? }: até 7 dias da compra e até 48 horas antes do evento, o dinheiro volta
         todo (a taxa junto). Se o evento mudou de dia, hora ou lugar depois da compra, vale até a hora dele. Ingresso
         usado não volta.
       acao "evento-cancelar" { evento } (o dono do evento): o evento fica cancelado e o dinheiro de cada pedido pago volta
         (de 30 em 30: o app chama até acabar); as cobranças abertas saem do Asaas.
   O aviso do Asaas (?asaas=aviso) libera, devolve e cai pela externalReference "ing:". Pagou e vale: o celular de quem
   vendeu e de quem comprou apita (a função "push", corre_ingresso_alvos). */
let COFRE: CryptoKey | null = null;
const encT = new TextEncoder(), decT = new TextDecoder();
const b64e = (u: Uint8Array) => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const b64d = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function cofre() {
  if (COFRE) return COFRE;
  const base = env('ASAAS_COFRE') || env('IG_CHAVE') || (env('SUPABASE_SERVICE_ROLE_KEY') ? 'corre-ig:' + env('SUPABASE_SERVICE_ROLE_KEY') : '');
  if (base.length < 24) throw { msg: 'Falta a chave do cofre.' };
  /* o rótulo deixa esta chave diferente da do cofre do Instagram, mesmo vindo da mesma base */
  const h = await crypto.subtle.digest('SHA-256', encT.encode('corre · subconta do asaas · ' + base));
  COFRE = await crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return COFRE;
}
async function cifraChave(t: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cofre(), encT.encode(t)));
  return `v1.${b64e(iv)}.${b64e(c)}`;
}
async function abreChave(s: string) {
  const [v, iv, c] = String(s || '').split('.');
  if (v !== 'v1' || !iv || !c) return '';
  try { return decT.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(iv) }, await cofre(), b64d(c))); } catch (_) { return ''; }
}
/* o Asaas com a chave de uma subconta (a situação e os documentos dela) */
async function asaasCom(chaveSub: string, caminho: string) {
  const r = await fetch(ASAAS() + caminho, { headers: { access_token: chaveSub, 'User-Agent': 'Corre (app.corresocial.com)' } });
  const o: any = await r.json().catch(() => null);
  if (!r.ok) throw { status: r.status, msg: String(o?.errors?.[0]?.description || `Asaas respondeu ${r.status}`).slice(0, 300) };
  return o;
}
const realBR = (v: number) => 'R$ ' + (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,180}\.[a-z]{2,}$/i;
/* pagou: o banco decide se vale; se o lugar acabou ou o evento foi cancelado, o dinheiro volta na hora. Valeu: o celular
   de quem vendeu e de quem comprou apita (a função "push", sem esperar ela) */
async function pagouIngresso(admin: any, cobranca: string, valor: number) {
  const r = await rpc(admin, 'corre_ingresso_paga', { p_cobranca: cobranca, p_valor: valor });
  if (r?.devolver) {
    await asaas(`/payments/${encodeURIComponent(cobranca)}/refund`, 'POST', { description: r.motivo === 'evento' ? 'O evento foi cancelado' : 'Os ingressos esgotaram antes do pagamento' })
      .catch((e: any) => { console.error('ingresso/devolver:', e?.status, e?.msg); throw e; });
    await rpc(admin, 'corre_ingresso_volta', { p_cobranca: cobranca, p_desistiu: false });
    return { devolvido: true };
  }
  if (r?.ok && !r.ja) avisaCelular();
  return r;
}
function avisaCelular() {
  const u = env('SUPABASE_URL'), k = env('SUPABASE_ANON_KEY');
  if (!u) return;
  fetch(u.replace(/\/+$/, '') + '/functions/v1/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(k ? { apikey: k, Authorization: 'Bearer ' + k } : {}) },
    body: JSON.stringify({ acao: 'pedidos' }), signal: AbortSignal.timeout(5000),
  }).catch(() => null);
}
const SIT: Record<string, string> = { APPROVED: 'aprovada', REJECTED: 'recusada', AWAITING_APPROVAL: 'analise', PENDING: 'pendente' };

async function muralzim(acao: string, body: any, user: any, admin: any) {
  try {
    /* ---- a conta de recebimento ---- */
    if (acao === 'org-ver') {
      if (user.id === FUNDADOR) return json({ ok: true, conta: { houzi: true, status: 'aprovada', pode: true } });
      const o = await rpc(admin, 'corre_org_conta', { p_dono: user.id });
      if (!o) return json({ ok: true, conta: null });
      let status = String(o.status || 'pendente'), docs = String(o.docs || '');
      const velho = !o.conferido_em || Date.now() - Date.parse(o.conferido_em) > 60e3;
      if (o.tipo === 'sub' && status !== 'aprovada' && o.chave && (velho || body?.agora)) {
        const k = await abreChave(o.chave);
        if (k) {
          const st = await asaasCom(k, '/myAccount/status').catch(() => null);
          if (st?.general) {
            status = SIT[String(st.general)] || 'pendente';
            if (status === 'pendente') {
              const d = await asaasCom(k, '/myAccount/documents').catch(() => null);
              const x = (d?.data || []).find((y: any) => y?.onboardingUrl && ['NOT_SENT', 'REJECTED', 'PENDING'].includes(String(y.status)));
              docs = x ? String(x.onboardingUrl) : docs;
            } else docs = '';
            await rpc(admin, 'corre_org_situacao', { p_dono: user.id, p_status: status, p_docs: docs });
          }
        }
      }
      return json({ ok: true, conta: { tipo: o.tipo, status, pode: status === 'aprovada', email: o.email, nome: o.nome, docs, wallet_fim: String(o.wallet || '').slice(-4) } });
    }

    if (acao === 'org-carteira') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body?.termos || ''))) return json({ erro: 'termos' }, 400);
      const w = String(body?.wallet || '').trim().toLowerCase();
      if (!UUID.test(w)) return json({ erro: 'wallet' }, 400);
      /* a carteira da própria Houzi não vale (o Asaas não divide pra quem cobra) */
      const minha = await asaas('/wallets').catch(() => null);
      if ((minha?.data || []).some((x: any) => String(x?.id || '').toLowerCase() === w)) return json({ erro: 'wallet_houzi' }, 400);
      const ja = await rpc(admin, 'corre_org_conta', { p_dono: user.id });
      if (ja?.tipo === 'sub' && ja.status !== 'recusada') return json({ erro: 'ja_tem' }, 409);
      await rpc(admin, 'corre_org_salva', { p_dono: user.id, p: { tipo: 'propria', wallet: w, status: 'aprovada', email: user.email || '', termos: String(body.termos) } });
      return json({ ok: true, status: 'aprovada' });
    }

    if (acao === 'org-conta') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body?.termos || ''))) return json({ erro: 'termos' }, 400);
      const ja = await rpc(admin, 'corre_org_conta', { p_dono: user.id });
      if (ja && ja.status !== 'recusada') return json({ ok: true, ja: true, status: ja.status });
      const tipo = String(body?.tipo || ''), nome = String(body?.nome || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      const email = String(body?.email || '').trim().toLowerCase(), doc = docOk(body?.doc);
      const cel = String(body?.celular || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''), cep = String(body?.cep || '').replace(/\D/g, '');
      const end = String(body?.endereco || '').trim().slice(0, 120), num = String(body?.numero || '').trim().slice(0, 12);
      const bairro = String(body?.bairro || '').trim().slice(0, 60), comp = String(body?.complemento || '').trim().slice(0, 60);
      const renda = Math.round(Number(String(body?.renda || '').replace(/\./g, '').replace(',', '.')) || 0);
      const ruim = (campo: string) => json({ erro: 'campo', campo }, 400);
      if (tipo !== 'pf' && tipo !== 'pj') return ruim('tipo');
      if (nome.length < 3) return ruim('nome');
      if (!EMAIL.test(email)) return ruim('email');
      if (!doc || (tipo === 'pf' ? doc.length !== 11 : doc.length !== 14)) return ruim('doc');
      let nasc = '';
      if (tipo === 'pf') {
        nasc = String(body?.nascimento || '');
        const n = Date.parse(nasc + 'T12:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc) || !n || n > Date.now() - 18 * 365.25 * 864e5 || n < Date.parse('1900-01-01')) return ruim('nascimento');
      }
      const empresa = String(body?.empresa || '');
      if (tipo === 'pj' && !['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'].includes(empresa)) return ruim('empresa');
      if (!/^\d{10,11}$/.test(cel)) return ruim('celular');
      if (!/^\d{8}$/.test(cep)) return ruim('cep');
      if (end.length < 3) return ruim('endereco');
      if (!num) return ruim('numero');
      if (bairro.length < 2) return ruim('bairro');
      if (!(renda > 0)) return ruim('renda');
      const c = await asaas('/accounts', 'POST', {
        name: nome, email, cpfCnpj: doc, ...(tipo === 'pf' ? { birthDate: nasc } : { companyType: empresa }), mobilePhone: cel,
        incomeValue: renda, address: end, addressNumber: num, ...(comp ? { complement: comp } : {}), province: bairro, postalCode: cep,
      });
      const wallet = String(c?.walletId || ''), conta = String(c?.id || ''), apiKey = String(c?.apiKey || '');
      if (!UUID.test(wallet)) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu a carteira da conta.' }, 502);
      await rpc(admin, 'corre_org_salva', { p_dono: user.id, p: { tipo: 'sub', asaas_id: conta, wallet, status: 'pendente', nome, email, chave: apiKey ? await cifraChave(apiKey) : '', termos: String(body.termos) } });
      return json({ ok: true, status: 'pendente', email });
    }

    /* ---- o ingresso ---- */
    if (acao === 'ingresso-comprar') {
      const termos = String(body?.termos || ''), forma = String(body?.forma || ''), ev = String(body?.evento || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(termos)) return json({ erro: 'termos' }, 400);
      if (forma !== 'pix' && forma !== 'cartao') return json({ erro: 'forma' }, 400);
      if (!UUID.test(ev)) return json({ erro: 'evento' }, 400);
      const itens = (Array.isArray(body?.itens) ? body.itens : []).slice(0, 8).map((x: any) => ({ lote: String(x?.lote || ''), qtd: Math.round(Number(x?.qtd) || 0) }))
        .filter((x: any) => UUID.test(x.lote) && x.qtd > 0);
      if (!itens.length) return json({ erro: 'itens' }, 400);
      /* o cliente no Asaas antes da reserva (a primeira vez pede nome e CPF): sem ele, nada fica preso */
      const cliente = await clienteDe(admin, user, body);
      if (cliente instanceof Response) return cliente;
      const r = await rpc(admin, 'corre_ingresso_reserva', { p_comprador: user.id, p_evento: ev, p_itens: itens, p_forma: forma, p_termos: termos, p_portador: String(body?.portador || '').slice(0, 80) });
      /* as reservas que caíram (venceram, ou a pessoa trocou a compra): a cobrança delas sai do Asaas */
      for (const v of (r?.velhos || [])) await asaas(`/payments/${encodeURIComponent(v.cobranca)}`, 'DELETE').catch(() => null);
      if (!r?.ok) return json({ erro: r?.motivo || 'reserva', lote: r?.lote || '' }, 409);
      const total = Number(r.total), taxa = Number(r.taxa), valor = Number(r.valor), [a, m, d] = String(r.dia).split('-');
      let pg: any;
      try {
        pg = await asaas('/payments', 'POST', {
          customer: cliente, billingType: forma === 'pix' ? 'PIX' : 'CREDIT_CARD', value: total, dueDate: hojeBR(),
          description: `Corre · Muralzim: ${r.qtd} ${r.qtd === 1 ? 'ingresso' : 'ingressos'} pra ${r.titulo} (${d}/${m}/${a} às ${r.inicio}, ${r.local}). Taxa de serviço de ${realBR(taxa)} inclusa.`.slice(0, 480),
          externalReference: `ing:${r.pedido}`,
          ...(r.wallet ? { split: [{ walletId: String(r.wallet), fixedValue: valor }] } : {}),
        });
      } catch (e: any) {
        await rpc(admin, 'corre_ingresso_cai', { p_pedido: r.pedido, p_cobranca: null }).catch(() => null);
        /* a carteira do organizador que o Asaas não conhece: quem compra fica sabendo que é do lado de lá */
        if (e?.msg && /wallet|carteira/i.test(e.msg)) return json({ erro: 'org' }, 409);
        throw e;
      }
      const cob = String(pg?.id || ''), link = String(pg?.invoiceUrl || '');
      if (!cob) { await rpc(admin, 'corre_ingresso_cai', { p_pedido: r.pedido, p_cobranca: null }).catch(() => null); return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu a cobrança.' }, 502); }
      const g = await admin.rpc('corre_ingresso_cobranca', { p_pedido: r.pedido, p_cobranca: cob, p_link: link });
      if (g.error || !g.data?.ok) {
        /* o banco não guardou: a cobrança que acabou de nascer sai do Asaas e os lugares voltam */
        console.error('ingresso/banco:', g.error?.message || 'reserva perdida');
        await asaas(`/payments/${encodeURIComponent(cob)}`, 'DELETE').catch(() => null);
        await rpc(admin, 'corre_ingresso_cai', { p_pedido: r.pedido, p_cobranca: null }).catch(() => null);
        return json({ erro: 'banco' }, 500);
      }
      let pix: any = null;
      if (forma === 'pix') {
        const q = await asaas(`/payments/${encodeURIComponent(cob)}/pixQrCode`).catch(() => null);
        if (q?.payload) pix = { img: String(q.encodedImage || ''), copia: String(q.payload), vence: String(q.expirationDate || '') };
      }
      return json({ ok: true, pedido: r.pedido, total, taxa, valor, qtd: r.qtd, forma, link, pix, reserva: new Date(Date.now() + 20 * 60e3).toISOString() });
    }

    if (acao === 'ingresso-pix') {
      const id = String(body?.pedido || '');
      if (!UUID.test(id)) return json({ erro: 'pedido' }, 400);
      const p = await rpc(admin, 'corre_ingresso_pedido', { p_comprador: user.id, p_pedido: id });
      if (!p || p.status !== 'pendente' || !p.asaas_cobranca) return json({ erro: 'pedido' }, 404);
      const q = await asaas(`/payments/${encodeURIComponent(p.asaas_cobranca)}/pixQrCode`);
      return json({ ok: true, pix: { img: String(q?.encodedImage || ''), copia: String(q?.payload || ''), vence: String(q?.expirationDate || '') }, total: Number(p.total), link: p.link || '' });
    }

    if (acao === 'ingresso-confere') {
      const L = (await rpc(admin, 'corre_ingresso_abertos', { p_comprador: user.id })) || [], pagos: string[] = [], devolvidos: string[] = [];
      for (const p of L.slice(0, 10)) {
        const c = await asaas(`/payments/${encodeURIComponent(p.cobranca)}`).catch(() => null);
        if (!c) continue;
        if (PAGO.includes(c.status)) { const r = await pagouIngresso(admin, String(p.cobranca), Number(c.value) || 0); if (r?.devolvido) devolvidos.push(p.id); else if (r?.ok) pagos.push(p.id); }
        else if (DEVOLVIDO.includes(c.status)) await rpc(admin, 'corre_ingresso_volta', { p_cobranca: String(p.cobranca), p_desistiu: false });
        else if (c.deleted || c.status === 'OVERDUE') await rpc(admin, 'corre_ingresso_cai', { p_pedido: null, p_cobranca: String(p.cobranca) });
      }
      return json({ ok: true, pagos, devolvidos });
    }

    if (acao === 'ingresso-desistir') {
      const nao = (motivo: string) => json({ ok: true, pode: false, motivo });
      const id = String(body?.pedido || '');
      if (!UUID.test(id)) return json({ erro: 'pedido' }, 400);
      const p = await rpc(admin, 'corre_ingresso_pedido', { p_comprador: user.id, p_pedido: id });
      if (!p || p.status !== 'pago') return nao(p?.status === 'estornado' ? 'devolvido' : 'sem_pagamento');
      if (Number(p.usados) > 0) return nao('usado');
      const comeca = Date.parse(p.comeca), pago = Date.parse(p.pago_em || p.criado_em);
      const mudou = !!(p.mudou_em && Date.parse(p.mudou_em) > pago);
      /* a regra: 7 dias da compra e até 48 horas antes; o evento que mudou depois da compra, até a hora dele */
      const ate = mudou ? comeca : Math.min(pago + PRAZO_DESISTE * 864e5, comeca - 48 * 3600e3);
      if (Date.now() > ate) return nao('prazo');
      if (body?.ver) return json({ ok: true, pode: true, valor: Number(p.total), ate: new Date(ate).toISOString(), mudou });
      /* primeiro o dinheiro (o Asaas desfaz a divisão junto); se ele recusar, nada muda */
      await asaas(`/payments/${encodeURIComponent(p.asaas_cobranca)}/refund`, 'POST', { description: mudou ? 'O evento mudou depois da compra: devolução' : 'Desistência da compra (CDC, art. 49)' });
      await rpc(admin, 'corre_ingresso_volta', { p_cobranca: String(p.asaas_cobranca), p_desistiu: true });
      return json({ ok: true, devolvido: Number(p.total) });
    }

    if (acao === 'evento-cancelar') {
      const id = String(body?.evento || '');
      if (!UUID.test(id)) return json({ erro: 'evento' }, 400);
      const r = await rpc(admin, 'corre_evento_cancela', { p_dono: user.id, p_evento: id });
      if (!r?.ok) return json({ erro: 'evento' }, 404);
      for (const a of (r.abertos || [])) await asaas(`/payments/${encodeURIComponent(a.cobranca)}`, 'DELETE').catch(() => null);
      let devolvidos = 0, falhas = 0, detalhe = '';
      for (const p of (r.pagos || [])) {
        try {
          await asaas(`/payments/${encodeURIComponent(p.cobranca)}/refund`, 'POST', { description: `O evento ${String(r.titulo || '').slice(0, 60)} foi cancelado` });
          await rpc(admin, 'corre_ingresso_volta', { p_cobranca: String(p.cobranca), p_desistiu: false });
          devolvidos++;
        } catch (e: any) { falhas++; detalhe = e?.msg || detalhe; console.error('cancelar/devolver:', e?.status, e?.msg || e?.banco); }
      }
      return json({ ok: true, devolvidos, falhas, detalhe, faltam: Math.max(0, Number(r.faltam || 0) - devolvidos) });
    }
    return json({ erro: 'acao' }, 400);
  } catch (e: any) {
    if (e && e.banco) { console.error('muralzim/banco:', e.banco); return json({ erro: 'banco' }, 503); }
    if (e && e.msg) { console.error('asaas/muralzim:', e.status, e.msg); return json({ erro: 'asaas', detalhe: e.msg }, 502); }
    console.error('muralzim:', e?.message || e); return json({ erro: 'rede' }, 502);
  }
}
