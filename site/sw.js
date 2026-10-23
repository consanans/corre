/* CORRE · service worker (v3.35 os avisos no celular; v4.33 o Corre instantâneo).
   Os avisos: chega o aviso (criptografado; o navegador abre), aparece na tela; tocou, abre o Corre no lugar certo. Com o
   Corre aberto e na frente, não toca: a tela já atualiza sozinha (no iPhone e no Safari toca sempre, que a Apple exige).
   O Corre instantâneo (o Thales: "deixar mais smart, moderno, inteligente"): o app fica guardado no aparelho.
   - A página (index.html) vem sempre da rede primeiro: o Corre segue abrindo fresco, com a versão nova. Só se a rede não
     responde em 3,5 s (ou caiu), abre a última guardada, e a da rede, quando chega, fica pra próxima.
   - O que tem versão no endereço (css e js com ?v=4.33, o config.js, a supabase-js) não muda nunca: sai do aparelho sem
     perguntar nada pra rede. Versão nova é endereço novo, e a guardada de antes do mesmo arquivo sai.
   - Imagem, ícone e fonte do próprio Corre: sai do aparelho e a rede atualiza por baixo.
   - Banco, funções, login, a volta do Instagram, os jogos e o resto: direto da rede, como sempre. */
'use strict';
const VERSAO = '4.33';
const CACHE = 'corre-app-1';
const UA = (self.navigator && self.navigator.userAgent) || '';
const APPLE = /iPhone|iPad|iPod|Macintosh/.test(UA) && !/Chrome|Chromium|CriOS|Edg\/|Firefox|FxiOS|Android/.test(UA);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  /* guardado de outro jeito (outro nome de cache, de uma versão de antes): sai */
  try{ for(const k of await caches.keys()) if(k.startsWith('corre-') && k !== CACHE) await caches.delete(k); }catch(err){}
  await self.clients.claim();
})()));

/* ---------- o Corre instantâneo ---------- */
const ESCOPO = new URL('./', self.registration.scope).href;
/* as páginas que são o app (o / e os endereços curtos que o _redirects manda pro index.html) */
const ehApp = u => u.href.split('#')[0].split('?')[0] === ESCOPO || /^\/(index\.html|@[^/]+|clientes)$/.test(u.pathname.slice(new URL(ESCOPO).pathname.length - 1));
const bom = r => r && r.ok && (r.type === 'basic' || r.type === 'cors') && !r.redirected;
self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET' || r.headers.has('range') || (r.cache === 'only-if-cached' && r.mode !== 'same-origin')) return;
  let u; try{ u = new URL(r.url); }catch(err){ return; }
  if(u.origin === self.location.origin){
    if(!u.href.startsWith(ESCOPO) || /\/sw\.js$/.test(u.pathname)) return;
    if(r.mode === 'navigate'){ if(ehApp(u)) e.respondWith(pagina(r)); return; }
    if(u.searchParams.has('v')) return e.respondWith(versionado(r, u));
    if(/\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i.test(u.pathname)) return e.respondWith(guardado(r));
    return;
  }
  /* a supabase-js de versão travada (o index já pede ela cedo): igual a um arquivo com versão */
  if(u.origin === 'https://cdn.jsdelivr.net' && /@\d+\.\d+\.\d+\//.test(u.pathname)) return e.respondWith(versionado(r, u));
});
/* a página: a rede primeiro (com a versão nova); a rede caiu ou demorou 3,5 s, a última guardada */
async function pagina(r){
  const c = await caches.open(CACHE);
  const rede = fetch(r).then(resp => { if(bom(resp)) c.put(ESCOPO, resp.clone()).catch(() => {}); return resp; });
  const guardada = await c.match(ESCOPO);
  if(!guardada) return rede;
  let solta; const prazo = new Promise(ok => { solta = setTimeout(() => ok(null), 3500); });
  try{
    const resp = await Promise.race([rede.catch(() => null), prazo]);
    clearTimeout(solta);
    return resp || guardada;
  }catch(err){ clearTimeout(solta); return guardada; }
}
/* o arquivo com versão: do aparelho; não tem, da rede, e a versão de antes do mesmo arquivo sai */
async function versionado(r, u){
  const c = await caches.open(CACHE);
  const tem = await c.match(r); if(tem) return tem;
  const resp = await fetch(r);
  if(bom(resp) || (resp && resp.type === 'opaque' && u.origin !== self.location.origin)){
    try{
      await c.put(r, resp.clone());
      if(u.origin === self.location.origin) for(const k of await c.keys()){ const x = new URL(k.url); if(x.pathname === u.pathname && x.search !== u.search) await c.delete(k); }
    }catch(err){}
  }
  return resp;
}
/* imagem e fonte: do aparelho na hora, e a rede atualiza por baixo */
async function guardado(r){
  const c = await caches.open(CACHE);
  const tem = await c.match(r);
  const rede = fetch(r).then(resp => { if(bom(resp)) c.put(r, resp.clone()).catch(() => {}); return resp; }).catch(() => null);
  if(tem){ rede.catch(() => {}); return tem; }
  return (await rede) || Response.error();
}

const janelas = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });
const fala = (abertas, m) => abertas.forEach(c => { try{ c.postMessage(m); }catch(e){} });

self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ try{ d = { corpo: e.data.text() }; }catch(er){ d = {}; } }
  e.waitUntil(mostra(d || {}));
});

async function mostra(d){
  const titulo = String(d.titulo || 'Corre').slice(0, 120);
  const url = typeof d.url === 'string' && /^\/(?!\/)/.test(d.url) ? d.url : '/';
  /* o número no ícone do app: mensagens não lidas e pedidos novos */
  if(typeof d.n === 'number' && self.navigator.setAppBadge){
    try{ if(d.n > 0) await self.navigator.setAppBadge(Math.min(d.n, 999)); else await self.navigator.clearAppBadge(); }catch(e){}
  }
  const abertas = await janelas();
  fala(abertas, { corre: 'push', t: String(d.t || ''), url, titulo });
  const naFrente = abertas.some(c => c.focused && c.visibilityState === 'visible');
  if(naFrente && !APPLE && d.t !== 'teste') return;
  const op = {
    body: String(d.corpo || '').slice(0, 300),
    icon: typeof d.icone === 'string' && /^https:\/\//.test(d.icone) ? d.icone : 'icon-192.png',
    badge: 'badge-96.png',
    data: { url, v: VERSAO },
    timestamp: Date.parse(d.em) || Date.now(),
    lang: 'pt-BR'
  };
  if(d.tag){ op.tag = String(d.tag).slice(0, 100); op.renotify = d.renotify !== false; }
  return self.registration.showNotification(titulo, op);
}

/* tocou no aviso: traz o Corre pra frente (ou abre) já na conversa, no post ou no perfil */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = new URL(typeof d.url === 'string' ? d.url : '/', self.registration.scope).href;
  e.waitUntil((async () => {
    const abertas = await janelas();
    /* v3.55: só a janela do app (o balcão da cidade é um iframe e não navega; a privacidade e a volta do Instagram também não) */
    const c = abertas.find(x => x.frameType !== 'nested' && x.url.startsWith(self.registration.scope) && !/[?&]embed\b/.test(x.url) && !/\/(privacidade|ig)\.html/.test(x.url));
    if(c){
      try{ await c.focus(); }catch(err){}
      c.postMessage({ corre: 'ir', url });
      return;
    }
    if(self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

/* o navegador trocou a inscrição (acontece no Firefox): pega uma nova; o Corre salva quando abrir */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try{
      const op = e.oldSubscription && e.oldSubscription.options;
      if(op && op.applicationServerKey) await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: op.applicationServerKey });
    }catch(err){}
    fala(await janelas(), { corre: 'push-sync' });
  })());
});
