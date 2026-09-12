const CACHE = "aghu-notes-cloud-v41";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./favicon-96-v16.png",
  "./favicon-48-v16.png",
  "./icon-192-v16.png",
  "./icon-512-v16.png",
  "./maskable-192-v16.png",
  "./maskable-512-v16.png",
  "./apple-touch-icon-v16.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  if(event.request.mode === "navigate"){
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if(resp && resp.ok) caches.open(CACHE).then(c => c.put("./index.html",resp.clone()));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(resp => {
        if(resp && resp.ok) caches.open(CACHE).then(c => c.put(event.request,resp.clone()));
        return resp;
      })
    )
  );
});
