// Service Worker: Offline-Betrieb. Bei Änderungen an Dateien VERSION erhöhen.
const VERSION = "v2";
const CACHE = "near-misses-" + VERSION;
const PRECACHE = [
  "./", "index.html", "manifest.webmanifest",
  "map-buddha.html", "map-christ.html", "map-islam.html", "map-nonduality.html",
  "map-editor/index.html", "map-editor/app.js", "map-editor/landkarte.js", "map-editor/maps-embedded.js",
  "map-editor/maps/index.json", "map-editor/maps/faelle.json", "map-editor/maps/buddha.json",
  "map-editor/maps/christ.json", "map-editor/maps/islam.json", "map-editor/maps/nonduality.json",
  "assets/thumb-buddha.svg", "assets/thumb-christ.svg", "assets/thumb-editor.svg",
  "assets/thumb-islam.svg", "assets/thumb-nonduality.svg",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("near-misses-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  // Nur eigene Dateien und Google Fonts cachen; externe Links (Wikipedia usw.) laufen normal.
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    // Stale-while-revalidate: sofort aus dem Cache, im Hintergrund aktualisieren.
    const refresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(refresh); return cached; }
    const res = await refresh;
    if (res) return res;
    if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
    return Response.error();
  })());
});
