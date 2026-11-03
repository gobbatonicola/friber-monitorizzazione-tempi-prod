/* Tempi Friber — service worker: funzionamento offline e ricezione di file condivisi da altre app.
   A ogni nuova versione pubblicata cambiare VERSIONE qui sotto. */
const VERSIONE = 'friber-tempi-2.0.4';
const RISORSE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/config.js', 'js/db.js', 'js/model.js', 'js/importer.js', 'js/xlsxwriter.js', 'js/exporter.js', 'js/backup.js', 'js/ui.js',
  'js/views/home.js', 'js/views/macchina.js', 'js/views/odp.js', 'js/views/admin.js', 'js/views/admin-dati.js', 'js/app.js',
  'vendor/xlsx.full.min.js',
  'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-600-normal.woff2', 'fonts/barlow-latin-700-normal.woff2',
  'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-800-normal.woff2',
  'img/sega19.jpg', 'img/sega25.jpg', 'img/smnas1.jpg', 'img/smnas2.jpg', 'img/smpic.jpg', 'img/flex.jpg', 'img/trebi.jpg', 'img/sab17.jpg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
];

importScripts('js/util.js', 'js/config.js', 'js/db.js');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(RISORSE.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSIONE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'salta-attesa') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/condividi')) { e.respondWith(ricevi(e.request)); return; }
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok) { const copia = resp.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); }
    return resp;
  })));
});

// File condivisi da Gmail o da File: vengono messi da parte e importati dal supervisore.
async function ricevi(req) {
  try {
    const fd = await req.formData();
    for (const f of fd.getAll('file')) if (f && typeof f === 'object' && f.size) await self.FT.db.inboxAggiungi(f);
  } catch (err) { console.error('Ricezione file non riuscita', err); }
  return Response.redirect(new URL('./?condiviso=1#/admin/ricevuti', self.registration.scope).href, 303);
}
