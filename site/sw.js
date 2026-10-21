/* CORRE · service worker (v3.35): só os avisos no celular.
   Não guarda o site em cache: o Corre abre sempre fresco, como antes. Chega o aviso (criptografado; o navegador
   abre), aparece na tela; tocou, abre o Corre no lugar certo. Com o Corre aberto e na frente, não toca: a tela já
   atualiza sozinha (no iPhone e no Safari toca sempre, que a Apple exige). */
'use strict';
const VERSAO = '3.35';
const UA = (self.navigator && self.navigator.userAgent) || '';
const APPLE = /iPhone|iPad|iPod|Macintosh/.test(UA) && !/Chrome|Chromium|CriOS|Edg\/|Firefox|FxiOS|Android/.test(UA);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
