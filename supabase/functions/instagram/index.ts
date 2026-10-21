// CORRE · função "instagram" (v3.40: cada pessoa conecta o próprio Instagram, no jeito do mLabs)
//  1. acao "conectar": a volta do login do Instagram (Business Login for Instagram). Troca o código pelo token, pega o
//     de 60 dias, lê a conta (/me) e guarda: a conta numa tabela que a pessoa vê, o token CIFRADO numa tabela que só as
//     funções leem. Só publica quem fez login na conta e deu a permissão de publicar.
//  2. acao "publicar": publica um post agora, pela conta que o post escolheu (a conta tem que ser da pessoa).
//  3. acao "fila": o relógio do banco chama de 5 em 5 minutos. Publica os programados que venceram, cada um pela conta
//     dele, e renova os tokens que vencem em menos de 10 dias (a Meta dá 60 dias e deixa renovar depois de 24 horas).
//  4. acao "contas": as contas conectadas da pessoa (sem token).
//     acao "status" (v3.41): o "Conferir a ligação" do app. Diz em sim/não o que falta (segredos, cofre, endereço de volta).
//  5. referências (padrão): os últimos posts de um @ (Business Discovery). Só com o IG_TOKEN do Gerenciador (opcional).
//  6. Meta: ?meta=desautorizou (a pessoa tirou o Corre no Instagram) e ?meta=apagar (pedido de exclusão de dados),
//     com o signed_request conferido pelo segredo do app. Pra Meta conseguir chamar, a função fica sem "Verify JWT"
//     (o login de quem usa o app é conferido aqui dentro, em cada ação).
//
// Segredos (Supabase > Edge Functions > Secrets):
//   IG_APP_ID, IG_APP_SECRET  o "ID do app do Instagram" e a "Chave secreta do app do Instagram" (Meta > o app >
//                             Casos de uso > Instagram > Configuração da API com login do Instagram)
//   IG_REDIRECT               opcional (padrão https://app.corresocial.com/ig.html): igual ao cadastrado na Meta
//   IG_CHAVE                  opcional: a chave que cifra os tokens (sem ela, sai uma derivada da chave de serviço)
//   IG_TOKEN                  opcional, só pras referências (token de usuário do sistema do Gerenciador)
//   IG_USER_ID                opcional, a conta que faz a consulta das referências
//   IG_API_VERSION            opcional (padrão v23.0)
//   IG_LIMITE_DIA             opcional, quantas puxadas de referência por pessoa por dia (padrão 10)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const env = (k: string, d = '') => Deno.env.get(k) || d;
const VER = env('IG_API_VERSION', 'v23.0');
const G = `https://graph.facebook.com/${VER}`;
const GI = `https://graph.instagram.com/${VER}`;
const APP_ID = env('IG_APP_ID'), APP_SECRET = env('IG_APP_SECRET');
const REDIRECT = env('IG_REDIRECT', 'https://app.corresocial.com/ig.html');
const SITE = env('SITE_URL', 'https://app.corresocial.com');
const LIMITE = Math.max(1, Number(env('IG_LIMITE_DIA', '10')) || 10);
const MAX_CONTAS = 20;
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX = 5 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const agora = () => new Date().toISOString();
function inicioDoDia() {
  const br = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return new Date(`${br}T03:00:00Z`).toISOString();
}

/* ---------- o cofre: o token da conta só é guardado cifrado (AES-GCM) ---------- */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u: Uint8Array) => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const deb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (s: string) => deb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
let CHAVE: CryptoKey | null = null;
async function chave() {
  if (CHAVE) return CHAVE;
  const base = env('IG_CHAVE') || (env('SUPABASE_SERVICE_ROLE_KEY') ? 'corre-ig:' + env('SUPABASE_SERVICE_ROLE_KEY') : '');
  if (base.length < 24) throw { code: 'config', message: 'Falta a chave do cofre (IG_CHAVE).' };
  const h = await crypto.subtle.digest('SHA-256', enc.encode(base));
  CHAVE = await crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return CHAVE;
}
async function cifra(t: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chave(), enc.encode(t)));
  return `v1.${b64(iv)}.${b64(c)}`;
}
async function decifra(s: string) {
  const [v, iv, c] = String(s || '').split('.');
  if (v !== 'v1' || !iv || !c) throw { code: 'cofre', message: 'A conexão guardada não abriu. Conecta a conta de novo.' };
  try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deb64(iv) }, await chave(), deb64(c))); }
  catch (_) { throw { code: 'cofre', message: 'A conexão guardada não abriu (a chave mudou?). Conecta a conta de novo.' }; }
}

/* ---------- Graph API ---------- */
/* o token nunca sai daqui: erro de rede (que traz a URL inteira) vira mensagem genérica, e qualquer texto da Meta passa pelo filtro */
const semToken = (s: unknown, TOKEN: string) => String(s ?? '').split(TOKEN).join('***').replace(/access_token=[^&\s"']+/gi, 'access_token=***');
async function chama(base: string, path: string, TOKEN: string, metodo = 'GET', corpo?: Record<string, string>) {
  const url = `${base}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(TOKEN)}`;
  let r: Response;
  try { r = await fetch(url, metodo === 'GET' ? undefined : { method: metodo, body: new URLSearchParams(corpo || {}) }); }
  catch (_) { throw { status: 502, code: 'rede', message: 'Sem conexão com a Meta agora. Tenta de novo daqui a pouco.' }; }
  const o: any = await r.json().catch(() => null);
  if (!r.ok || o?.error) {
    const e = o?.error || {};
    throw { status: r.status, code: e.code, sub: e.error_subcode, message: semToken(e.error_user_msg || e.message || `HTTP ${r.status}`, TOKEN) };
  }
  return o;
}
const graph = (p: string, T: string, m = 'GET', c?: Record<string, string>) => chama(G, p, T, m, c);
const igapi = (p: string, T: string, m = 'GET', c?: Record<string, string>) => chama(GI, p, T, m, c);
const erroMeta = (e: any) => {
  if (e?.code === 190) return 'sem_chave';
  if (e?.code === 10 || e?.code === 200 || e?.code === 3) return 'sem_permissao';
  if (e?.code === 4 || e?.code === 17 || e?.code === 32 || e?.code === 613 || e?.code === 9) return 'ocupado';
  return 'provedor';
};
/* as contas do Gerenciador que o token de usuário do sistema enxerga (só pras referências) */
async function contasGerenciador(TOKEN: string) {
  const o = await graph('me/accounts?fields=instagram_business_account{id}&limit=25', TOKEN);
  return (o.data || []).map((p: any) => p.instagram_business_account?.id).filter(Boolean);
}

/* ---------- publicar ---------- */
/* uma imagem com legenda: cria o contêiner, espera ficar pronto e publica */
async function publicarIG(igId: string, imageUrl: string, caption: string, alt: string, TOKEN: string) {
  const corpo: Record<string, string> = { image_url: imageUrl, caption };
  if (alt) corpo.alt_text = alt.slice(0, 1000);
  let c: any;
  try { c = await igapi(`${igId}/media`, TOKEN, 'POST', corpo); }
  catch (e: any) {
    /* versão da API sem o alt_text: vai sem ele */
    if (alt && /alt_text/i.test(String(e?.message || ''))) { delete corpo.alt_text; c = await igapi(`${igId}/media`, TOKEN, 'POST', corpo); }
    else throw e;
  }
  for (let i = 0; i < 12; i++) {
    const s = await igapi(`${c.id}?fields=status_code,status`, TOKEN).catch(() => null);
    if (!s || s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw { code: 'midia', message: s.status || 'O Instagram não aceitou a imagem.' };
    await sleep(1500);
  }
  const p = await igapi(`${igId}/media_publish`, TOKEN, 'POST', { creation_id: c.id });
  const l = await igapi(`${p.id}?fields=permalink`, TOKEN).catch(() => ({}));
  return { id: String(p.id), link: String((l as any).permalink || '') };
}
/* a conta do post, com o token aberto (a conta tem que ser de quem é o post) */
async function contaComToken(admin: any, contaId: string, dono: string) {
  const { data: c } = await admin.from('corre_ig_contas').select('*').eq('id', contaId).maybeSingle();
  if (!c || c.dono !== dono) throw { code: 'sem_conta', message: 'A conta do Instagram desse post não tá mais conectada. Escolhe outra no post.' };
  if (c.status !== 'ok') throw { code: 'conta_' + c.status, message: c.status === 'expirou' ? `A conexão com @${c.username} venceu. Conecta de novo no Studio.` : `@${c.username} tirou a permissão do Corre. Conecta de novo no Studio.` };
  const { data: t } = await admin.from('corre_ig_tokens').select('token').eq('conta', c.id).maybeSingle();
  if (!t) throw { code: 'sem_conta', message: `Conecta @${c.username} de novo no Studio.` };
  return { conta: c, token: await decifra(t.token) };
}
async function publicarPost(admin: any, post: any) {
  const fim = (patch: any) => admin.from('corre_posts').update(patch).eq('id', post.id);
  let conta: any = null;
  try {
    if (!post.midia_url) throw { code: 'sem_arte', message: 'O post não tem arte salva.' };
    if (!post.ig_conta) throw { code: 'sem_conta', message: 'O post não tem conta do Instagram escolhida.' };
    const ct = await contaComToken(admin, post.ig_conta, post.dono);
    conta = ct.conta;
    const r = await publicarIG(conta.ig_id, post.midia_url, String(post.legenda || '').slice(0, 2200), String(post.alt || ''), ct.token);
    await fim({ ig_status: 'publicado', ig_media_id: r.id, ig_link: r.link, ig_erro: '', status: 'postado' });
    return { ok: true, id: r.id, link: r.link, conta: conta.username };
  } catch (e: any) {
    let msg = String(e?.message || 'Não deu pra publicar.').slice(0, 280);
    if (conta && e?.code === 190) {
      await admin.from('corre_ig_contas').update({ status: 'expirou', erro: 'A Meta recusou a conexão (venceu ou foi tirada).', updated_at: agora() }).eq('id', conta.id);
      msg = `A conexão com @${conta.username} venceu ou foi tirada. Conecta de novo no Studio.`;
    } else if (e?.sub === 2207009 || /aspect ratio/i.test(msg)) {
      msg = 'A arte tá fora do formato do feed (a Meta aceita de 4:5, em pé, a 1,91:1, deitada). Usa uma arte 4:5 ou quadrada.';
    }
    console.error('publicar:', post.id, e?.code, msg);
    await fim({ ig_status: 'erro', ig_erro: msg });
    return { ok: false, erro: typeof e?.code === 'string' ? e.code : erroMeta(e), detalhe: msg };
  }
}
/* renova os tokens que vencem em menos de 10 dias (a Meta só renova token com mais de 24 horas) */
async function renova(admin: any) {
  const limite = new Date(Date.now() + 10 * 864e5).toISOString();
  const { data: L } = await admin.from('corre_ig_contas').select('id,username,expira_em').eq('status', 'ok').lt('expira_em', limite).order('expira_em').limit(15);
  let n = 0;
  for (const c of L || []) {
    if (c.expira_em && Date.parse(c.expira_em) < Date.now()) {
      await admin.from('corre_ig_contas').update({ status: 'expirou', erro: 'A conexão venceu (60 dias sem renovar). Conecta de novo.', updated_at: agora() }).eq('id', c.id);
      continue;
    }
    const { data: t } = await admin.from('corre_ig_tokens').select('token,renovado_em').eq('conta', c.id).maybeSingle();
    if (!t || Date.parse(t.renovado_em) > Date.now() - 864e5) continue;
    try {
      const tok = await decifra(t.token);
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(tok)}`);
      const o: any = await r.json().catch(() => null);
      if (!r.ok || !o?.access_token) {
        if (o?.error?.code === 190) await admin.from('corre_ig_contas').update({ status: 'expirou', erro: 'A Meta não renovou a conexão. Conecta de novo.', updated_at: agora() }).eq('id', c.id);
        continue;
      }
      const exp = new Date(Date.now() + (Number(o.expires_in) || 5184000) * 1000).toISOString();
      await admin.from('corre_ig_tokens').update({ token: await cifra(String(o.access_token)), renovado_em: agora() }).eq('conta', c.id);
      /* aproveita e atualiza a foto e o nome (a foto do Instagram é um link que vence) */
      const me = await igapi('me?fields=username,name,profile_picture_url', String(o.access_token)).catch(() => null);
      await admin.from('corre_ig_contas').update(Object.assign({ expira_em: exp, erro: '', updated_at: agora() }, me ? { username: String(me.username || c.username).toLowerCase(), nome: String(me.name || '').slice(0, 120), foto: String(me.profile_picture_url || '').slice(0, 1000) } : {})).eq('id', c.id);
      n++;
    } catch (_) { /* tenta de novo na próxima volta do relógio */ }
  }
  return n;
}

/* ---------- Meta: desautorização e exclusão de dados (signed_request) ---------- */
async function assinatura(sr: string) {
  const [sig, payload] = String(sr || '').split('.');
  if (!sig || !payload || !APP_SECRET) return null;
  try {
    const k = await crypto.subtle.importKey('raw', enc.encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', k, b64url(sig), enc.encode(payload)))) return null;
    return JSON.parse(dec.decode(b64url(payload)));
  } catch (_) { return null; }
}
async function chamadoDaMeta(req: Request, admin: any, tipo: string) {
  let sr = '';
  try { const f = await req.formData(); sr = String(f.get('signed_request') || ''); } catch (_) { /* sem corpo */ }
  const dados = await assinatura(sr);
  if (!dados) return json({ erro: 'assinatura' }, 400);
  const quem = String(dados.user_id || '');
  if (admin && /^\d{1,40}$/.test(quem)) {
    const { data: L } = await admin.from('corre_ig_contas').select('id').or(`app_uid.eq.${quem},ig_id.eq.${quem}`);
    const ids = (L || []).map((x: any) => x.id);
    if (ids.length) {
      await admin.from('corre_ig_tokens').delete().in('conta', ids);
      if (tipo === 'apagar') {
        // antes de apagar a conta (o post perde o vínculo depois): o código e o link do post no Instagram também são dado que veio da Meta
        await admin.from('corre_posts').update({ ig_media_id: '', ig_link: '' }).in('ig_conta', ids);
        await admin.from('corre_ig_contas').delete().in('id', ids);
      } else await admin.from('corre_ig_contas').update({ status: 'revogada', erro: 'A conta tirou a permissão do Corre no Instagram.', updated_at: agora() }).in('id', ids);
    }
  }
  if (tipo === 'apagar') return json({ url: `${SITE}/privacidade.html#instagram`, confirmation_code: crypto.randomUUID().replace(/-/g, '').slice(0, 16) });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const SB_URL = env('SUPABASE_URL'), SB_ANON = env('SUPABASE_ANON_KEY'), SB_SERV = env('SUPABASE_SERVICE_ROLE_KEY');
  const admin = SB_SERV ? createClient(SB_URL, SB_SERV, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

  /* ---------- a Meta chamando (sem login do app: vale a assinatura do segredo) ---------- */
  const meta = new URL(req.url).searchParams.get('meta') || '';
  if (meta === 'desautorizou' || meta === 'apagar') return await chamadoDaMeta(req, admin, meta);

  let body: any = null;
  try { body = await req.json(); } catch (_) { return json({ erro: 'usuario' }, 400); }
  const acao = String(body?.acao || '');

  /* ---------- a fila (o relógio do banco chama; não precisa de login: só publica o que já venceu, pela conta do post) ---------- */
  if (acao === 'fila') {
    if (!admin) return json({ erro: 'config' }, 503);
    const { data: posts, error } = await admin.rpc('corre_ig_fila_contas', { lim: 10 });
    if (error) return json({ erro: 'banco', detalhe: error.message }, 500);
    const out: any[] = [];
    for (const p of posts || []) out.push({ id: p.id, ...(await publicarPost(admin, p)) });
    let renovadas = 0;
    try { renovadas = await renova(admin); } catch (e: any) { console.error('renova:', e?.message); }
    /* v3.55: a resposta não leva o detalhe dos posts (quem chama a fila pode ser qualquer um, e o post é de outra pessoa);
       o detalhe fica só no log da função */
    if (out.length) console.log('fila:', JSON.stringify(out));
    return json({ ok: true, feitos: out.length, renovadas });
  }

  /* ---------- daqui pra baixo, precisa do login do app ---------- */
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ erro: 'login' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u } = await sb.auth.getUser(jwt);
  const user = u && u.user;
  if (!user) return json({ erro: 'login' }, 401);

  /* ---------- v3.41 · conferir a ligação: o que o login do Instagram precisa, só em sim/não ----------
     Nunca devolve o valor (nem o tamanho) de um segredo. O app manda o IG_APP_ID dele (que é público) pra ver se bate. */
  if (acao === 'status') {
    const propria = env('IG_CHAVE');
    let cofre = 'falta';
    try { await chave(); cofre = propria ? 'proprio' : 'servico'; } catch (_) { cofre = propria ? 'curta' : 'falta'; }
    const pedido = String(body?.app_id || '').trim().slice(0, 40);
    const aceitos = [REDIRECT, ...env('IG_REDIRECTS').split(/[\s,]+/).filter(Boolean)];
    return json({ diag: {
      app_id: !!APP_ID, app_secret: !!APP_SECRET, mesmo_id: APP_ID && pedido ? APP_ID === pedido : null,
      cofre, servico: !!admin, redirect: REDIRECT, redirect_ok: aceitos.includes(String(body?.redirect_uri || REDIRECT)),
    } });
  }

  /* ---------- conectar: a volta do login do Instagram ---------- */
  if (acao === 'conectar') {
    if (!admin) return json({ erro: 'config' }, 503);
    if (!APP_ID || !APP_SECRET) return json({ erro: 'sem_app' }, 503);
    const code = String(body?.code || '').replace(/#_$/, '').trim();
    if (!code || code.length > 2000) return json({ erro: 'code' }, 400);
    const redirect = String(body?.redirect_uri || REDIRECT);
    const aceitos = [REDIRECT, ...env('IG_REDIRECTS').split(/[\s,]+/).filter(Boolean)];
    if (!aceitos.includes(redirect)) return json({ erro: 'redirect', detalhe: `O endereço de volta tem que ser ${REDIRECT}` }, 400);
    try { await chave(); } catch (e: any) { return json({ erro: 'config', detalhe: e?.message }, 503); }
    /* 1. o código (vale 1 hora, uma vez só) vira o token curto */
    let curto = '', uid = '', perms = '';
    try {
      const troca = async (uri: string) => {
        const r = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, grant_type: 'authorization_code', redirect_uri: uri, code }) });
        const o: any = await r.json().catch(() => null);
        return { r, o, d: Array.isArray(o?.data) ? o.data[0] : o };
      };
      let { r, o, d } = await troca(redirect);
      /* v4.15: a Meta avisa que o painel dela pode pôr uma barra no fim do endereço de volta sozinho, e aí o código vem
         preso ao endereço com a barra (o Thales, em 21/10: "Error validating verification code... redirect_uri"). Com
         esse erro, tenta uma vez o mesmo endereço com e sem a barra no fim; código que não existe dá outro erro e não repete */
      if (!d?.access_token && /redirect_uri/i.test(String(o?.error_message || ''))) {
        const outro = redirect.endsWith('/') ? redirect.slice(0, -1) : redirect + '/';
        const t = await troca(outro);
        console.warn('conectar/barra:', outro, t.d?.access_token ? 'deu certo' : String(t.o?.error_message || t.r.status));
        if (t.d?.access_token) ({ r, o, d } = t);
      }
      if (!r.ok || !d?.access_token) {
        console.error('conectar/code:', r.status, o?.error_type, o?.error_message);
        if (/redirect_uri/i.test(String(o?.error_message || ''))) return json({ erro: 'redirect_meta', detalhe: `A Meta recusou o endereço de volta. No painel da Meta (Instagram › Configuração da API com login do Instagram › Configurações do login empresarial › URIs de redirecionamento do OAuth), deixa só ${REDIRECT} e salva. Depois conecta de novo.` }, 400);
        return json({ erro: 'login_meta', detalhe: String(o?.error_message || 'O Instagram não aceitou o login. Tenta de novo.').slice(0, 200) }, 400);
      }
      curto = String(d.access_token); uid = String(d.user_id || '');
      perms = Array.isArray(d.permissions) ? d.permissions.join(',') : String(d.permissions || '');
    } catch (_) { return json({ erro: 'rede' }, 502); }
    if (perms && !/instagram_business_content_publish/.test(perms)) return json({ erro: 'sem_publicar' }, 400);
    /* 2. o token de 60 dias (o segredo do app só existe aqui) */
    let longo = '', exp = '';
    try {
      const r = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(APP_SECRET)}&access_token=${encodeURIComponent(curto)}`);
      const o: any = await r.json().catch(() => null);
      if (!r.ok || !o?.access_token) { console.error('conectar/60d:', r.status, o?.error?.message); return json({ erro: 'login_meta', detalhe: 'Não deu pra pegar a conexão de 60 dias. Tenta de novo.' }, 502); }
      longo = String(o.access_token); exp = new Date(Date.now() + (Number(o.expires_in) || 5184000) * 1000).toISOString();
    } catch (_) { return json({ erro: 'rede' }, 502); }
    /* 3. qual conta é */
    let me: any;
    try { me = await igapi('me?fields=user_id,username,name,profile_picture_url,account_type', longo); }
    catch (e: any) { return json({ erro: erroMeta(e), detalhe: e?.message }, 502); }
    const igId = String(me.user_id || me.id || ''), username = String(me.username || '').toLowerCase();
    if (!/^\d{1,30}$/.test(igId) || !/^[a-z0-9_.]{1,30}$/.test(username)) return json({ erro: 'conta' }, 502);
    /* 4. guarda (conta nova conta no limite; reconectar a mesma só renova) */
    const { data: ja } = await admin.from('corre_ig_contas').select('id').eq('dono', user.id).eq('ig_id', igId).maybeSingle();
    if (!ja) {
      const { count } = await admin.from('corre_ig_contas').select('id', { count: 'exact', head: true }).eq('dono', user.id);
      if ((count ?? 0) >= MAX_CONTAS) return json({ erro: 'limite_contas' }, 429);
    }
    const { data: ct, error: e1 } = await admin.from('corre_ig_contas').upsert({
      dono: user.id, ig_id: igId, app_uid: (uid || String(me.id || '')).slice(0, 40), username, nome: String(me.name || '').slice(0, 120),
      foto: String(me.profile_picture_url || '').slice(0, 1000), tipo: String(me.account_type || '').slice(0, 30), status: 'ok', erro: '', expira_em: exp, updated_at: agora(),
    }, { onConflict: 'dono,ig_id' }).select('id,username,nome,foto,tipo,status,erro,expira_em,conectada_em').single();
    if (e1 || !ct) return json({ erro: 'banco', detalhe: e1?.message }, 500);
    const { error: e2 } = await admin.from('corre_ig_tokens').upsert({ conta: ct.id, token: await cifra(longo), renovado_em: agora() });
    if (e2) return json({ erro: 'banco', detalhe: e2.message }, 500);
    return json({ ok: true, conta: ct });
  }

  /* ---------- as contas conectadas da pessoa ---------- */
  if (acao === 'contas') {
    const { data } = await sb.from('corre_ig_contas').select('id,username,nome,foto,tipo,status,erro,expira_em,conectada_em').order('conectada_em');
    return json({ contas: data || [] });
  }

  /* ---------- publicar agora, pela conta do post ---------- */
  if (acao === 'publicar') {
    if (!admin) return json({ erro: 'config' }, 503);
    const id = String(body?.post_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erro: 'post' }, 400);
    /* o post tem que ser da pessoa (as regras do banco valem: ela só enxerga os dela) */
    const { data: post } = await sb.from('corre_posts').select('*').eq('id', id).maybeSingle();
    if (!post) return json({ erro: 'post' }, 404);
    if (post.ig_status === 'publicado') return json({ ok: true, ja: true, link: post.ig_link });
    if (post.ig_status === 'publicando') return json({ erro: 'publicando' }, 409);
    if (!post.ig_conta) return json({ erro: 'sem_conta' }, 400);
    const { data: pego } = await admin.from('corre_posts').update({ ig_status: 'publicando', ig_tentativas: Math.min(20, (post.ig_tentativas || 0) + 1) })
      .eq('id', id).neq('ig_status', 'publicando').neq('ig_status', 'publicado').select('*').maybeSingle();
    if (!pego) return json({ erro: 'publicando' }, 409);
    const r = await publicarPost(admin, pego);
    return json(r, r.ok ? 200 : 502);
  }

  /* ---------- referências: os últimos posts de um @ (Business Discovery, com o token do Gerenciador) ---------- */
  const TOKEN = env('IG_TOKEN');
  if (!TOKEN) return json({ erro: 'sem_chave' }, 503);
  const usuario = String(body?.usuario || '').trim().replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(usuario)) return json({ erro: 'usuario' }, 400);
  const qtd = Math.min(9, Math.max(1, Number(body?.qtd) || 9));
  const { count } = await sb.from('corre_geracoes').select('id', { count: 'exact', head: true })
    .eq('dono', user.id).eq('tipo', 'instagram').gte('created_at', inicioDoDia());
  if ((count ?? 0) >= LIMITE) return json({ erro: 'limite' }, 429);
  { const { data: ok, error: eq } = await sb.rpc('corre_cota_minha', { p_tipo: 'instagram', p_lim: LIMITE }); if (eq || ok !== true) return json({ erro: 'limite' }, 429); }

  let IG_ID = env('IG_USER_ID');
  if (!IG_ID) {
    try { IG_ID = (await contasGerenciador(TOKEN))[0] || ''; } catch (e: any) { return json({ erro: erroMeta(e), detalhe: e?.message }, 503); }
    if (!IG_ID) return json({ erro: 'sem_chave', detalhe: 'O token não enxerga nenhuma conta do Instagram.' }, 503);
  }
  const campos = `business_discovery.username(${usuario}){username,name,media.limit(${qtd + 6}){media_type,media_url,thumbnail_url,permalink}}`;
  let out: any = null;
  try { out = await graph(`${encodeURIComponent(IG_ID)}?fields=${encodeURIComponent(campos)}`, TOKEN); }
  catch (e: any) {
    console.error('instagram:', e?.status, e?.code, e?.sub, e?.message);
    if (e?.code === 110 || e?.sub === 2207013 || /cannot find user|cannot be found/i.test(e?.message || '')) return json({ erro: 'nao_comercial' }, 404);
    const k = erroMeta(e);
    return json({ erro: k, detalhe: e?.message }, k === 'sem_chave' ? 503 : k === 'ocupado' ? 429 : 502);
  }
  const bd = out?.business_discovery;
  const midias: any[] = bd?.media?.data || [];
  if (!midias.length) return json({ erro: 'sem_posts' }, 404);

  /* baixa e guarda na pasta da pessoa (as regras do bucket valem como se fosse ela) */
  const urls: string[] = [];
  const carimbo = Date.now().toString(36);
  for (const m of midias) {
    if (urls.length >= qtd) break;
    const src = m.media_type === 'VIDEO' ? (m.thumbnail_url || '') : (m.media_url || m.thumbnail_url || '');
    if (!src) continue;
    try {
      const g = await fetch(src);
      if (!g.ok) continue;
      const tipo = (g.headers.get('content-type') || '').split(';')[0];
      if (!TIPOS[tipo]) continue;
      const b = await g.blob();
      if (b.size > MAX) continue;
      const path = `${user.id}/ig-${carimbo}-${urls.length + 1}.${TIPOS[tipo]}`;
      const up = await sb.storage.from('corre').upload(path, b, { contentType: tipo, upsert: false });
      if (up.error) { console.error('storage:', up.error.message); continue; }
      urls.push(sb.storage.from('corre').getPublicUrl(path).data.publicUrl);
    } catch (_) { /* pula essa */ }
  }
  if (!urls.length) return json({ erro: 'provedor', detalhe: 'nenhuma imagem baixou' }, 502);
  await sb.from('corre_geracoes').insert({ tipo: 'instagram', prompt: `@${bd.username || usuario}` });
  return json({ urls, conta: { usuario: bd.username || usuario, nome: bd.name || '' } });
});
