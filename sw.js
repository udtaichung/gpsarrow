/* 軌跡箭頭 — 離線快取
   山區沒訊號時，整個 App（含已讀過的 GPX）仍要能重新開啟。 */
const VERSION = 'gpsarrow-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 快取優先：騎乘中不該為了網路等待，且多半根本沒訊號。
  e.respondWith(
    caches.match(req, {ignoreSearch: false}).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // 順便把讀過的 GPX 存起來，之後離線也開得了
        if (res.ok && res.type === 'basic'){
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        // 離線又沒快取：導覽請求退回首頁
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
