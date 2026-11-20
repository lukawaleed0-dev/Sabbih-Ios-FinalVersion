(async () => {
  if (!('serviceWorker' in navigator) || !window.caches) return;

  // تأكد إن الـ Service Worker مسجّل (التسجيل المكرر مش بيضر)
  try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}

  const CACHE = 'sabbih-quran';
  const TOTAL = 604;
  const url = n => `./quran/${String(n).padStart(3, '0')}.webp`;
  const cache = await caches.open(CACHE);

  // الزر
  const btn = document.createElement('button');
  btn.style.cssText =
    'position:fixed;top:10px;right:10px;z-index:30;border:1px solid #e0c66a88;' +
    'background:#071f1ae8;color:#f0d476;border-radius:12px;padding:8px 12px;' +
    'font:700 12px Cairo,sans-serif;max-width:60vw';
  document.body.appendChild(btn);

  async function count() {
    let c = 0;
    for (let n = 1; n <= TOTAL; n++)
      if (await cache.match(url(n), { ignoreSearch: true })) c++;
    return c;
  }

  async function refresh() {
    const have = await count();
    btn.textContent = have === TOTAL
      ? '✓ المصحف محمّل أوفلاين'
      : `⬇ تحميل المصحف (${have}/${TOTAL})`;
    return have;
  }
  await refresh();

  btn.onclick = async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

    let done = 0, failed = 0;
    for (let i = 1; i <= TOTAL; i += 6) {
      const jobs = [];
      for (let n = i; n < i + 6 && n <= TOTAL; n++) {
        jobs.push((async () => {
          try {
            if (!(await cache.match(url(n), { ignoreSearch: true })))
              await cache.add(url(n));
          } catch (e) { failed++; }
          btn.textContent = `جارٍ التحميل ${++done} / ${TOTAL}`;
        })());
      }
      await Promise.all(jobs);
    }
    btn.disabled = false;
    const have = await refresh();
    if (failed) btn.textContent = `ناقص ${TOTAL - have} صفحة، دوس تاني`;
  };
})();
