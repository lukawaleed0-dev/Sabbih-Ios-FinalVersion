(function () {
  if (!('serviceWorker' in navigator) || !window.caches) return;

  const CACHE = 'sabbih-quran';
  const TOTAL = 604;
  const url = n => './quran/' + String(n).padStart(3, '0') + '.webp';

  const btn = document.createElement('button');
  btn.textContent = '⬇ تحميل المصحف للأوفلاين';
  btn.style.cssText =
    'position:fixed;top:10px;right:10px;z-index:30;border:1px solid #e0c66a88;' +
    'background:#071f1af2;color:#f0d476;border-radius:12px;padding:9px 13px;' +
    'font:700 12px Cairo,sans-serif;white-space:nowrap;width:auto;height:auto';
  document.body.appendChild(btn);

  async function count(cache) {
    let c = 0;
    for (let n = 1; n <= TOTAL; n++) {
      const hit = await cache.match(url(n), { ignoreSearch: true });
      if (hit) c++;
    }
    return c;
  }

  async function refresh(cache) {
    const have = await count(cache);
    btn.textContent = have >= TOTAL
      ? '✓ المصحف محمّل أوفلاين'
      : '⬇ تحميل المصحف (' + have + '/' + TOTAL + ')';
    return have;
  }

  btn.onclick = async function () {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const cache = await caches.open(CACHE);
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      let done = 0, failed = 0;
      for (let i = 1; i <= TOTAL; i += 6) {
        const jobs = [];
        for (let n = i; n < i + 6 && n <= TOTAL; n++) {
          jobs.push((async function () {
            try {
              const hit = await cache.match(url(n), { ignoreSearch: true });
              if (!hit) await cache.add(url(n));
            } catch (e) { failed++; }
            done++;
            btn.textContent = 'جارٍ التحميل ' + done + ' / ' + TOTAL;
          })());
        }
        await Promise.all(jobs);
      }
      const have = await refresh(cache);
      if (failed && have < TOTAL) btn.textContent = 'ناقص ' + (TOTAL - have) + ' صفحة، دوس تاني';
    } catch (e) {
      btn.textContent = 'خطأ: ' + (e && e.message ? e.message : e);
    }
    btn.disabled = false;
  };

  caches.open(CACHE).then(refresh).catch(function (e) {
    btn.textContent = '⬇ تحميل المصحف للأوفلاين';
  });
})();
