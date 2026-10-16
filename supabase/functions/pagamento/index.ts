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
//
// Segredos (Supabase > Edge Functions > Secrets):
//   ASAAS_API_KEY        a chave da API do Asaas (Asaas > Integrações > Chave de API). Começa com $aact_
//   ASAAS_WEBHOOK_TOKEN  um texto qualquer, longo, igual ao "Token de autenticação" do webhook no Asaas
//   ASAAS_AMBIENTE       opcional: "sandbox" (pra testar com dinheiro de mentira) ou "producao" (padrão)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const env = (k: string, d = '') => Deno.env.get(k) || d;
const ASAAS = env('ASAAS_AMBIENTE') === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const PRODUTOS: Record<string, string> = { studio: 'Studio', houzi: 'Studio Houzi', horus: 'Hórus' };
/* o preço de cada plano (o Studio pelo nível: quantas redes) */
const preco = (produto: string, nivel: number) =>
  produto === 'houzi' ? 29.9 : produto === 'horus' ? 9.9 : nivel >= 4 ? 79.9 : nivel === 3 ? 69.9 : nivel === 2 ? 59.9 : 0;
const descricao = (produto: string, nivel: number) =>
  produto === 'studio' ? `Corre · Studio, ${nivel >= 4 ? '4 ou mais redes sociais' : `${nivel} redes sociais`}` : `Corre · ${PRODUTOS[produto]}`;

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
  const r = await fetch(ASAAS + caminho, {
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

/* ---------- o aviso do Asaas ---------- */
async function aviso(req: Request, admin: any) {
  const tok = env('ASAAS_WEBHOOK_TOKEN');
  if (!tok || !igual(req.headers.get('asaas-access-token') || '', tok)) return json({ erro: 'token' }, 401);
  let ev: any = null; try { ev = await req.json(); } catch (_) { return json({ erro: 'corpo' }, 400); }
  const id = String(ev?.id || ''), tipo = String(ev?.event || '');
  if (!id || !tipo) return json({ ok: true, ignorado: 'sem id' });
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
    } else if (tipo === 'PAYMENT_CREATED' || tipo === 'PAYMENT_UPDATED') {
      if (pg?.invoiceUrl && ['PENDING', 'OVERDUE'].includes(pg.status)) muda.link = String(pg.invoiceUrl);
    } else if (tipo === 'PAYMENT_OVERDUE') {
      muda.status = a.status === 'cancelada' ? 'cancelada' : 'atrasada'; if (pg?.invoiceUrl) muda.link = String(pg.invoiceUrl);
    } else if (tipo === 'PAYMENT_REFUNDED' || tipo === 'PAYMENT_CHARGEBACK_REQUESTED' || tipo === 'PAYMENT_CHARGEBACK_DISPUTE') {
      /* devolveu o dinheiro: o período pago acaba hoje */
      muda.status = 'atrasada'; muda.pago_ate = new Date(Date.now() - 3 * 3600e3 - 4 * 864e5).toISOString().slice(0, 10);
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

    if (acao === 'cancelar') {
      if (!a?.asaas_assinatura || a.status === 'cancelada') return json({ ok: true, ja: true });
      await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'DELETE').catch((e: any) => { if (e?.status !== 404) throw e; });
      await admin.from('corre_assinaturas').update({ status: 'cancelada', link: '', updated_at: agora() }).eq('id', a.id);
      return json({ ok: true, pago_ate: a.pago_ate, teste_ate: a.teste_ate });
    }

    if (acao !== 'assinar') return json({ erro: 'acao' }, 400);
    const nivel = produto === 'studio' ? Math.max(2, Math.min(4, Math.round(Number(body?.nivel) || 2))) : 1;
    const valor = preco(produto, nivel);

    /* já assinou e segue valendo: no Studio, outro nível troca o valor; senão, devolve a fatura em aberto */
    if (a?.asaas_assinatura && a.status !== 'cancelada') {
      const trocou = produto === 'studio' && nivel !== a.nivel;
      if (trocou) {
        const corpo = { value: valor, description: descricao(produto, nivel), updatePendingPayments: true };
        await asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'PUT', corpo)
          .catch((e: any) => (e?.status === 404 || e?.status === 405 ? asaas(`/subscriptions/${encodeURIComponent(a.asaas_assinatura)}`, 'POST', corpo) : Promise.reject(e)));
      }
      const f = await faturaAberta(a.asaas_assinatura).catch(() => null);
      await admin.from('corre_assinaturas').update({ nivel, valor, link: f?.link || a.link || '', updated_at: agora() }).eq('id', a.id);
      return json({ ok: true, link: f?.link || '', trocou });
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
    const vence = noTeste ? new Date(Date.parse(a.teste_ate) - 3 * 3600e3).toISOString().slice(0, 10) : hojeBR();
    const s = await asaas('/subscriptions', 'POST', {
      customer: cliente, billingType: 'UNDEFINED', value: valor, nextDueDate: vence < hojeBR() ? hojeBR() : vence, cycle: 'MONTHLY',
      description: descricao(produto, nivel), externalReference: `${user.id}:${produto}`,
    });
    const sub = String(s.id || ''); if (!sub) return json({ erro: 'asaas', detalhe: 'O Asaas não devolveu a assinatura.' }, 502);
    const f = await faturaAberta(sub).catch(() => null);
    const linha = { dono: user.id, produto, nivel, valor, status: noTeste ? 'teste' : 'pendente', asaas_assinatura: sub, link: f?.link || '', updated_at: agora() };
    const { error } = a ? await admin.from('corre_assinaturas').update(linha).eq('id', a.id) : await admin.from('corre_assinaturas').insert(linha);
    if (error) { console.error('assinar/banco:', error.message); return json({ erro: 'banco' }, 500); }
    return json({ ok: true, link: f?.link || '', vence, teste: noTeste });
  } catch (e: any) {
    if (e && e.msg) { console.error('asaas:', e.status, e.msg); return json({ erro: 'asaas', detalhe: e.msg }, 502); }
    console.error('pagamento:', e?.message || e); return json({ erro: 'rede' }, 502);
  }
});
