// 离线缓存：程序文件预先缓存；地图瓦片看过的会缓存（离线时可显示看过的区域）。
const APP_CACHE = 'nest-app-v0.2';
const TILE_CACHE = 'nest-tiles-v1';
const APP_FILES = [
  './', 'index.html', 'style.css', 'i18n.js', 'app.js', 'manifest.webmanifest', 'icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];
const TILE_HOSTS = ['cyberjapandata.gsi.go.jp', 'tile.openstreetmap.org'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== APP_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (TILE_HOSTS.includes(url.hostname)) {
    // 瓦片：先用缓存，没有再联网并存起来
    e.respondWith(caches.open(TILE_CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // 程序文件：联网优先（方便更新），断网时用缓存
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) caches.open(APP_CACHE).then((c) => c.put(e.request, res.clone()));
    return res;
  }).catch(() => caches.match(e.request)));
});
