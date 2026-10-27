const CACHE_NAME = "zune-pwa-v3";

const BASE_URL = self.registration.scope;
const HOME_URL = new URL("./", BASE_URL).href;
const MANIFEST_URL = new URL("manifest.json", BASE_URL).href;

// Orodha ya faili za ziada unazotaka zihifadhiwe moja kwa moja wakati wa kusakinisha
const ADDITIONAL_FILES = [
  // Weka njia za faili zako hapa, mfano:
  // "./css/style.css",
  // "./js/app.js",
  "./images/icon-192x192.png",
  "./images/icon-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([HOME_URL, MANIFEST_URL, ...ADDITIONAL_FILES])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("zune-pwa-") &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 1. Huduma kwa ajili ya Kurasa (Navigation)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);

        return (
          await cache.match(request) ||
          await cache.match(HOME_URL) ||
          new Response(
            "ZUNE: Hakuna muunganisho wa intaneti. Tafadhali jaribu tena ukiwa mtandaoni.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          )
        );
      })
    );
    return;
  }

  // 2. Huduma kwa ajili ya rasilimali nyingine (CSS, JS, Picha, n.k.) - Stratejia ya Cache kwanza kisha Mtandao
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Unaweza kuchagua kuhifadhi faili hizi mpya kwenye cache zikitafutwa
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Kama hakuna mtandao na faili halipo kwenye cache, unaweza kurudisha kitu mbadala kama kinahitajika
      });
    })
  );
});
