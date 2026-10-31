/* Sabbih PWA service worker — غيّر رقم VERSION عند أي تحديث للتطبيق */
const VERSION = 'v1';
const SHELL = 'sabbih-shell-' + VERSION;
const PAGES = 'sabbih-quran';   /* صفحات المصحف: كاش ثابت لا يُمسح مع التحديثات */
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './bg.jpg', './adhan.mp3',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(
    SHELL_FILES.map(u => c.add(u).catch(() => {}))   /* ملف ناقص لا يفشّل التثبيت */
  )).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('sabbih-shell-') && k !== SHELL).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

/* iOS Safari يطلب الصوت بـ Range — لازم نرجّع 206 من الكاش */
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1)
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isQuran = url.pathname.includes('/quran/');
  const cacheName = isQuran ? PAGES : SHELL;

  e.respondWith((async () => {
    const cache = await caches.open(cacheName);
    let res = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (!res && !isQuran) res = await caches.match(req, { ignoreSearch: true });
    if (!res) {
      try {
        const full = await fetch(req.headers.has('range') ? url.pathname : req);
        if (full.ok && full.status === 200) cache.put(req.headers.has('range') ? url.pathname : req, full.clone());
        res = full;
      } catch (err) {
        if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
        return Response.error();
      }
    }
    if (req.headers.has('range') && res.status === 200) return rangeResponse(req, res);
    return res;
  })());
});
