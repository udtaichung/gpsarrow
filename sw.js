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

  // stale-while-revalidate：立刻回快取（騎乘中不該為了網路等待，且多半沒訊號），
  // 同時在背景更新，下次開啟就是新版。純 cache-first 會讓已安裝的使用者
  // 永遠停在舊版，除非每次發版都記得手動改 VERSION——那太容易忘。
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
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
      return hit || net;
    })
  );
});
