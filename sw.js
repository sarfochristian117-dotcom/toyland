const CACHE = "toyland-owner-v1";
const FILES = ["./owner.html", "./style.css", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Only cache: our own files and the Firebase code files from gstatic.
  // Never touch live data (Firestore, login) or Cloudinary uploads.
  const ours = url.origin === self.location.origin;
  const firebaseCode = url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0;
  if (!ours && !firebaseCode) return;

  // Network first (so updates show up), fall back to saved copy when offline.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./owner.html")))
  );
});
