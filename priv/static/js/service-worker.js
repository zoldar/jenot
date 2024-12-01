// caching

const cacheName = "jenot-v1";
const appShellFiles = [
  "/index.html",
  "/style.css",
  "/img/android-chrome-192x192.png",
  "/img/android-chrome-512x512.png",
  "/img/apple-touch-icon.png",
  "/img/favicon.ico",
  "/img/favicon-16x16.png",
  "/img/favicon-32x32.png",
  "/js/components.js",
  "/js/dom.js",
  "/js/jenot.js",
  "/js/notifications.js",
  "/js/service-worker-init.js",
  "/js/synced-store.js",
];

const cacheFirst = async (e) => {
  const responseFromCache = await caches.match(e.request);
  if (responseFromCache) {
    return responseFromCache;
  }

  const responseFromNetwork = await fetch(e.request);
  // Cloning is needed because a response can only be consumed once.
  const responseClone = responseFromNetwork.clone();
  caches
    .open(cacheName)
    .then((cache) => cache.put(e.request.clone(), responseClone));
  return responseFromNetwork;
};

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(appShellFiles))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key === cacheName) {
              return;
            }
            return caches.delete(key);
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api")) {
    return;
  }

  event.respondWith(cacheFirst(event));
});
