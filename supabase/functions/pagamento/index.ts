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
    let cliente = '';
    const { data: cl } = await admin.from('corre_asaas_clientes').select('cliente').eq('dono', user.id).maybeSingle();
    if (cl?.cliente) cliente = cl.cliente;
    else {
      const nome = String(body?.nome || '').replace(/\s+/g, ' ').trim().slice(0, 100), doc = docOk(body?.doc);
      if (nome.length < 3) return json({ erro: 'nome' }, 400);
      if (!doc) return json({ erro: 'doc' }, 400);
      const c = await asaas('/customers', 'POST', { name: nome, cpfCnpj: doc, email: user.email || undefined, externalReference: user.id, notificationDisabled: false });
      cliente = String(c.id || '');
      if (!cliente) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu o cliente.' }, 502);
      await admin.from('corre_asaas_clientes').upsert({ dono: user.id, cliente });
    }

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
