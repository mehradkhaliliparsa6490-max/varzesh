/* Service Worker — لیگ ورزش‌ها v1.7.2
   با هر تغییر در فایل‌ها، عدد VERSION را بالا ببرید. */
const VERSION = 'v1.7.2';
const CACHE = 'league-' + VERSION;
const SHELL = ['./', './index.html', './v150-patch.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('league-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // داده‌ها و ارتباط زنده Supabase هرگز کش نمی‌شود
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isCdn = url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !isFont && !isCdn) return;

  // فونت و کتابخانه‌ها: اول کش، همزمان به‌روزرسانی در پس‌زمینه
  if (isFont || isCdn) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // فایل‌های خود سایت: اول شبکه (تا نسخه جدید زود برسد)، در صورت قطعی از کش
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
