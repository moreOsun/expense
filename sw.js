/* ================= Service Worker - 日常记账 离线缓存 ================= */
/* 版本更新流程：改动页面后，同步递增下方 CACHE 版本号，并更新 index.html 里的
   <meta name="app-version">，用户下次联网打开即自动拿到新版 */
var CACHE = 'expense-tracker-v1.2.4';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-32.png',
  './icon-48.png',
  './icon-96.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 取用策略：导航/HTML 网络优先（断网回退缓存，保证离线可用且改版即时生效）；
// 其余静态资源 stale-while-revalidate（离线快，后台更新）。
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var isNav = req.mode === 'navigate' || /\.html?$/i.test(new URL(req.url).pathname);

  if (isNav) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req).then(function (h) { return h || caches.match('./index.html'); }); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      var refresh = fetch(req).then(function (res) {
        if (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return null; });
      return hit || refresh.then(function (r) { return r || Response.error(); });
    })
  );
});
