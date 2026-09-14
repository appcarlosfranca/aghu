const CACHE='aghu-notes-cloud-v57-5-shell';
const SHELL=[
  './manifest.webmanifest',
  './icon-192-v16.png',
  './icon-512-v16.png',
  './maskable-192-v16.png',
  './maskable-512-v16.png',
  './apple-touch-icon-v16.png',
  './favicon-96-v16.png',
  './fundo-azul-marinho-neon.png',
  './moldura-neon-oceano.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('aghu-notes-')&&k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  // Nunca intercepta Supabase, Mercado Pago ou outros backends.
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'})
        .then(resp=>{
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
          return resp;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
      if(resp && resp.ok){
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return resp;
    }))
  );
});
