const CACHE = "aghu-notes-shell-v18";
const ASSETS = [
  "/aghu/",
  "/aghu/index.html",
  "/aghu/manifest.webmanifest",
  "/aghu/favicon.ico",
  "/aghu/favicon-96-v16.png",
  "/aghu/favicon-48-v16.png",
  "/aghu/icon-192-v16.png",
  "/aghu/icon-512-v16.png",
  "/aghu/maskable-192-v16.png",
  "/aghu/maskable-512-v16.png",
  "/aghu/apple-touch-icon-v16.png"
];
const SUPABASE_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    try {
      const response = await fetch(SUPABASE_LIB, {mode:"cors"});
      if (response.ok) await cache.put(SUPABASE_LIB, response.clone());
    } catch {}
  })());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok) caches.open(CACHE).then(c => c.put("/aghu/index.html", resp.clone()));
        return resp;
      }).catch(() => caches.match("/aghu/index.html"))
    );
    return;
  }

  if (url.href.startsWith("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2")) {
    event.respondWith(
      caches.match(SUPABASE_LIB).then(cached => cached || fetch(req).then(resp => {
        caches.open(CACHE).then(c => c.put(SUPABASE_LIB, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.ok) caches.open(CACHE).then(c => c.put(req, resp.clone()));
      return resp;
    }).catch(() => caches.match(req))
  );
});
