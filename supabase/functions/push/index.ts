// CORRE · função "push" (v3.72; os lembretes, v4.06): manda os avisos no celular (Web Push), criptografados.
//
// O app chama depois de cada ação (C.push.avisa em push.js): mensagem, resposta, post com menção ou citação, seguiu,
// curtiu, story, pedido pra entrar em grupo e aceito no grupo. Quem recebe e o que diz é o BANCO que decide
// (corre_push_alvos, da v3.35; só o servidor chama): respeita bloqueio, quem vê o grupo, a preferência de cada um e o
// limite de 60 avisos em 10 minutos por pessoa, e cada ação avisa uma vez só. Aqui só cifra e entrega no serviço de
// aviso do navegador (Google, Apple, Mozilla, Microsoft), que só entrega, não lê.
//   acao "chave": a chave pública do Corre (o navegador inscreve o aparelho com ela).
//   acao "teste" { endpoint? }: um aviso de teste pros aparelhos da pessoa (um por minuto).
//   { tipo, id }: o aviso da ação.
//   acao "lembretes" (v4.06, SEM login): o relógio do banco (pg_cron, todo dia às 18h07 de Brasília) chama e a função
//     entrega o que o corre_lembretes_alvos devolve. Quem decide é o banco: só das 17h às 20h59, um por dia e três por
//     semana por pessoa, gravado antes de sair; chamar de novo ou fora da hora não manda nada pra ninguém.
//   acao "lembrete-teste" (v4.06): o "Mandar um lembrete de exemplo" do app, só pros aparelhos de quem pediu (um por minuto).
//   acao "pedidos" (v4.16, SEM login): a página do pedido de orçamento, a do Mural e a do orçamento aprovado chamam logo
//     depois que o cliente manda; a função entrega o que o corre_pedidos_alvos devolve (os últimos 10 minutos, um aviso
//     por pedido, gravado antes de sair). Desde a v4.17, também o cliente que terminou de responder o link de aprovação
//     do Studio (corre_aprov_alvos, do mesmo jeito).
// Aparelho que o serviço diz que sumiu (404/410) sai do banco (corre_push_mortos).
//
// A cifra é a do padrão (RFC 8291, aes128gcm) e a assinatura do Corre é a VAPID (RFC 8292), tudo com o WebCrypto do
// Deno: nenhuma biblioteca de fora mexe nas chaves.
//
// Segredos (Supabase > Edge Functions > Secrets). Gerados no computador do Thales (ferramentas/chaves-avisos.html),
// nunca no repositório nem no chat:
//   VAPID_PUBLIC_KEY   a chave pública (87 letras)
//   VAPID_PRIVATE_KEY  a chave privada (43 letras)
//   VAPID_SUBJECT      opcional: quem manda (padrão https://app.corresocial.com; nada de e-mail pros serviços de fora)
// Sem as duas, a função responde "sem_chave" e o app diz que não deu pra ligar. (A tabela corre_push_chaves da v3.35,
// que guardaria a chave no banco, fica sem uso: a regra da casa é chave privada só nos Secrets.)
// "Verify JWT" desligado, como as outras: o login de quem chama é conferido aqui dentro.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const env = (k: string, d = '') => (Deno.env.get(k) || d).trim();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TIPOS = ['msg', 'resp', 'post', 'seguiu', 'curtiu', 'story', 'grupo-pedido', 'grupo-aceito'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* só os serviços de aviso de verdade (o mesmo do corre_push_endpoint_ok do banco): a função nunca chama outro endereço */
const SERVICO = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\/[^\s]{8,}$/;
/* aparelhos por pessoa num aviso (quem tem mais que isso, os mais recentes primeiro: o banco já manda nessa ordem) */
const POR_PESSOA = 10;

const enc = new TextEncoder();
function b64u(b: Uint8Array) { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function deB64u(s: string) { let t = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const bin = atob(t), o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
function junta(...ps: Uint8Array[]) { const o = new Uint8Array(ps.reduce((t, p) => t + p.length, 0)); let i = 0; for (const p of ps) { o.set(p, i); i += p.length; } return o; }
async function hmac(chave: Uint8Array, dado: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, dado));
}

/* ---------- as chaves do Corre (VAPID) ---------- */
type Vapid = { pub: string, priv: CryptoKey };
let VAPID: Vapid | null = null, VAPID_DE = '', MOTIVO = '';
/* v3.72b: por que as chaves não valeram, sem mostrar chave nenhuma (os nomes com "vapid" que a função enxerga e o
   tamanho de cada valor); vai no registro da função e na resposta, pro Thales e o Claude acharem o erro de colar */
function motivo(pub: string, d: string) {
  let nomes: string[] = [];
  try { nomes = Object.keys(Deno.env.toObject()).filter(k => /vapid/i.test(k)); } catch (_) { /* sem lista */ }
  const letras = (v: string) => v.replace(/[A-Za-z0-9_-]/g, '').length;
  return `nomes=${JSON.stringify(nomes)} publica=${pub.length} (fora do alfabeto: ${letras(pub)}) privada=${d.length} (fora do alfabeto: ${letras(d)})`;
}
async function vapid(): Promise<Vapid | null> {
  const pub = env('VAPID_PUBLIC_KEY'), d = env('VAPID_PRIVATE_KEY');
  if (VAPID && VAPID_DE === pub + d) return VAPID;
  if (!/^[A-Za-z0-9_-]{87}$/.test(pub) || !/^[A-Za-z0-9_-]{43}$/.test(d)) { MOTIVO = 'formato: ' + motivo(pub, d); return null; }
  const p = deB64u(pub);
  if (p.length !== 65 || p[0] !== 4) { MOTIVO = 'a pública não é uma chave P-256'; return null; }
  try {
    const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33)), d, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    /* confere que a privada é par da pública (colou trocado, todo aviso voltaria 403 sem dizer por quê) */
    const ver = await crypto.subtle.importKey('raw', p, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const prova = enc.encode('corre · par de chaves');
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, prova);
    if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, ver, sig, prova)) { MOTIVO = 'o par não casa (a privada é de outra geração)'; return null; }
    VAPID = { pub, priv }; VAPID_DE = pub + d; MOTIVO = ''; return VAPID;
  } catch (e) { MOTIVO = 'importar: ' + String(e).slice(0, 160); return null; }
}
/* a assinatura VAPID: um JWT por serviço (aud = a origem do endereço), vale 12 horas; guardado enquanto vale */
const JWTS = new Map<string, { t: string, ate: number }>();
async function jwt(aud: string, v: Vapid) {
  const c = JWTS.get(aud); if (c && c.ate > Date.now() + 10 * 60e3) return c.t;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const cab = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64u(enc.encode(JSON.stringify({ aud, exp, sub: env('VAPID_SUBJECT') || 'https://app.corresocial.com' })));
  /* o WebCrypto já devolve a assinatura no formato do JWT (r e s colados, 64 bytes) */
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.priv, enc.encode(cab + '.' + corpo)));
  const t = `${cab}.${corpo}.${b64u(sig)}`;
  JWTS.set(aud, { t, ate: exp * 1000 }); return t;
}

/* ---------- a cifra (RFC 8291): só o navegador do aparelho abre ---------- */
type Aparelho = { endpoint: string, p256dh: string, auth: string };
async function cifra(a: Aparelho, texto: Uint8Array) {
  const ua = deB64u(a.p256dh), auth = deB64u(a.auth);
  if (ua.length !== 65 || ua[0] !== 4 || auth.length < 16) throw new Error('chave do aparelho');
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const segredo = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await hmac(auth, segredo);
  const ikm = await hmac(prkKey, junta(enc.encode('WebPush: info\0'), ua, asPub, new Uint8Array([1])));
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, junta(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, junta(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  /* um registro só: o texto, o 2 que diz "último" e o selo do GCM */
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, junta(texto, new Uint8Array([2]))));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return junta(sal, rs, new Uint8Array([asPub.length]), asPub, ct);
}

/* o que vai no aviso, no tamanho que cabe (o serviço aceita até 4 KB cifrado; o texto longo encurta) */
function textoDo(p: Record<string, unknown>) {
  let s = JSON.stringify(p);
  if (s.length > 3000) s = JSON.stringify({ ...p, corpo: String(p.corpo || '').slice(0, 200), icone: '' });
  return enc.encode(s);
}

/* entrega num aparelho: 'ok', 'morto' (o serviço disse que ele sumiu) ou 'falhou' */
async function entrega(v: Vapid, a: Aparelho, texto: Uint8Array, urgencia: string) {
  if (!a || typeof a.endpoint !== 'string' || !SERVICO.test(a.endpoint) || a.endpoint.length > 1000) return 'falhou';
  try {
    const corpo = await cifra(a, texto);
    const r = await fetch(a.endpoint, {
      method: 'POST',
      headers: {
        'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: urgencia,
        Authorization: `vapid t=${await jwt(new URL(a.endpoint).origin, v)}, k=${v.pub}`,
      },
      body: corpo,
    });
    try { await r.body?.cancel(); } catch (_) { /* nada pra ler */ }
    if (r.status === 404 || r.status === 410) return 'morto';
    if (!r.ok) console.warn('[push]', new URL(a.endpoint).host, r.status);
    return r.ok ? 'ok' : 'falhou';
  } catch (e) { console.warn('[push]', String(e).slice(0, 200)); return 'falhou'; }
}
/* manda pra uma lista de [aparelho, aviso], de 20 em 20, e tira do banco os aparelhos que sumiram */
async function manda(admin: any, v: Vapid, lista: [Aparelho, Uint8Array, string][]) {
  let ok = 0; const mortos: string[] = [];
  for (let i = 0; i < lista.length; i += 20) {
    const r = await Promise.all(lista.slice(i, i + 20).map(([a, t, u]) => entrega(v, a, t, u)));
    r.forEach((x, j) => { if (x === 'ok') ok++; else if (x === 'morto') mortos.push(lista[i + j][0].endpoint); });
  }
  if (mortos.length) await admin.rpc('corre_push_mortos', { p_endpoints: mortos });
  return { ok, mortos: mortos.length };
}

/* o que o banco devolve ([{ payload, subs }]) vira a lista de entrega: cada aparelho da pessoa com o aviso dela */
function lista(L: any[], urg: string) {
  const P: [Aparelho, Uint8Array, string][] = [];
  for (const x of L) {
    if (!x || typeof x.payload !== 'object' || !Array.isArray(x.subs)) continue;
    const texto = textoDo(x.payload);
    for (const a of x.subs.slice(0, POR_PESSOA)) P.push([a, texto, urg]);
  }
  return P;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const SB_URL = env('SUPABASE_URL'), SB_ANON = env('SUPABASE_ANON_KEY'), SB_SERV = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!SB_URL || !SB_SERV) return json({ erro: 'config' }, 503);
  const admin = createClient(SB_URL, SB_SERV, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: any = null;
  try { body = await req.json(); } catch (_) { body = null; }
  const acao = String(body?.acao || '');

  /* v4.06: os lembretes do dia, sem login (o pg_cron não tem login). Não dá pra abusar: o banco só solta no horário,
     grava cada um antes de devolver e não devolve de novo */
  if (acao === 'lembretes') {
    const v = await vapid();
    if (!v) { console.warn('[push] sem_chave', MOTIVO); return json({ erro: 'sem_chave' }, 503); }
    const { data: alvos, error } = await admin.rpc('corre_lembretes_alvos', {});
    if (error) { console.warn('[push] lembretes', error.message); return json({ erro: 'banco' }, 503); }
    const L = Array.isArray(alvos) ? alvos : [];
    const r = await manda(admin, v, lista(L, 'normal'));
    console.log('[push] lembretes', JSON.stringify({ pessoas: L.length, entregues: r.ok, saiu: r.mortos }));
    return json({ ok: true, pessoas: L.length, entregues: r.ok, saiu: r.mortos });
  }

  /* v4.16: o que o cliente acabou de fazer (pediu orçamento, escolheu a proposta no Mural, aprovou o orçamento), sem
     login: quem pede orçamento não tem conta. A página do pedido chama logo depois de mandar. Não dá pra abusar: o banco
     só devolve o que mudou nos últimos 10 minutos e marca cada um antes de sair, então chamar de novo não manda nada */
  if (acao === 'pedidos') {
    const v = await vapid();
    if (!v) { console.warn('[push] sem_chave', MOTIVO); return json({ erro: 'sem_chave' }, 503); }
    const { data: alvos, error } = await admin.rpc('corre_pedidos_alvos', {});
    if (error) { console.warn('[push] pedidos', error.message); return json({ erro: 'banco' }, 503); }
    const L = Array.isArray(alvos) ? alvos : [];
    /* v4.17: e o cliente que terminou de responder o link de aprovação do Studio (sem o delta da 4.17, só os pedidos) */
    const { data: aprov, error: ea } = await admin.rpc('corre_aprov_alvos', {});
    if (ea) console.warn('[push] aprovacao', ea.message);
    else if (Array.isArray(aprov)) L.push(...aprov);
    if (!L.length) return json({ ok: true, pessoas: 0, entregues: 0 });
    const r = await manda(admin, v, lista(L, 'high'));
    console.log('[push] pedidos', JSON.stringify({ pessoas: L.length, entregues: r.ok, saiu: r.mortos }));
    return json({ ok: true, pessoas: L.length, entregues: r.ok, saiu: r.mortos });
  }

  /* o login de quem chama (é quem "fez a ação": o banco confere que a ação é mesmo dessa pessoa) */
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ erro: 'login' }, 401);
  const sb = createClient(SB_URL, SB_ANON || SB_SERV, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u } = await sb.auth.getUser(token);
  const user = u && u.user;
  if (!user) return json({ erro: 'login' }, 401);
  if (!body) return json({ erro: 'corpo' }, 400);
  const v = await vapid();
  if (!v) { console.warn('[push] sem_chave', MOTIVO); return json({ erro: 'sem_chave', motivo: MOTIVO }, 503); }

  if (acao === 'chave') return json({ chave: v.pub });

  if (acao === 'teste') {
    const ep = typeof body?.endpoint === 'string' && body.endpoint.length <= 1000 ? body.endpoint : null;
    /* um teste por minuto (a marca no log do banco só entra uma vez por minuto) */
    const { data: livre, error: e1 } = await admin.rpc('corre_push_marca', { p_chave: `teste:${user.id}:${Math.floor(Date.now() / 60e3)}`, p_quem: user.id });
    if (e1) return json({ erro: 'banco' }, 503);
    if (livre === false) return json({ erro: 'devagar' }, 429);
    const { data: meus, error: e2 } = await admin.rpc('corre_push_meus', { p_dono: user.id, p_endpoint: ep });
    if (e2) return json({ erro: 'banco' }, 503);
    const L: Aparelho[] = Array.isArray(meus) ? meus.slice(0, POR_PESSOA) : [];
    if (!L.length) return json({ erro: 'sem_aparelho' }, 404);
    const texto = textoDo({ titulo: 'Corre', corpo: 'Aviso de teste: tá chegando certinho.', url: '/#/', tag: 'teste', renotify: true, t: 'teste', em: new Date().toISOString() });
    const r = await manda(admin, v, L.map(a => [a, texto, 'high'] as [Aparelho, Uint8Array, string]));
    return json({ ok: r.ok > 0, aparelhos: L.length, entregues: r.ok, saiu: r.mortos });
  }

  /* v4.06: um lembrete de exemplo pra quem pediu (o que ele receberia agora, ou um texto de exemplo), um por minuto */
  if (acao === 'lembrete-teste') {
    const { data: livre, error: e1 } = await admin.rpc('corre_push_marca', { p_chave: `lembra-teste:${user.id}:${Math.floor(Date.now() / 60e3)}`, p_quem: user.id });
    if (e1) return json({ erro: 'banco' }, 503);
    if (livre === false) return json({ erro: 'devagar' }, 429);
    const { data: alvos, error } = await admin.rpc('corre_lembretes_alvos', { p_dono: user.id, p_teste: true });
    if (error) { console.warn('[push] lembrete-teste', error.message); return json({ erro: 'banco' }, 503); }
    const L = Array.isArray(alvos) ? alvos : [];
    if (!L.length) return json({ erro: 'sem_aparelho' }, 404);
    const r = await manda(admin, v, lista(L, 'high'));
    return json({ ok: r.ok > 0, tipo: String(L[0]?.tipo || ''), entregues: r.ok, saiu: r.mortos });
  }

  const tipo = String(body?.tipo || ''), id = String(body?.id || '');
  if (!TIPOS.includes(tipo)) return json({ erro: 'tipo' }, 400);
  if (!UUID.test(id)) return json({ erro: 'id' }, 400);
  const { data: alvos, error } = await admin.rpc('corre_push_alvos', { p_tipo: tipo, p_id: id, p_quem: user.id });
  if (error) { console.warn('[push] banco', error.message); return json({ erro: 'banco' }, 503); }
  const L = Array.isArray(alvos) ? alvos : [];
  /* mensagem chega na hora; o resto pode esperar o celular acordar */
  const urg = tipo === 'msg' || tipo === 'grupo-aceito' ? 'high' : 'normal';
  const P = lista(L, urg);
  if (!P.length) return json({ ok: true, pessoas: 0, entregues: 0 });
  const r = await manda(admin, v, P);
  return json({ ok: true, pessoas: L.length, entregues: r.ok, saiu: r.mortos });
});
