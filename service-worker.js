const CACHE_NAME = "zune-pwa-v2";

const BASE_URL = self.registration.scope;
const HOME_URL = new URL("./", BASE_URL).href;
const MANIFEST_URL = new URL("manifest.json", BASE_URL).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([HOME_URL, MANIFEST_URL])
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
  }
});