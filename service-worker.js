const CACHE_NAME = "zune-pwa-v1";

const APP_SHELL = [
  new URL("./", self.registration.scope).pathname,
  new URL("manifest.json", self.registration.scope).pathname
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) =>
            key.startsWith("zune-pwa-") &&
            key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
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
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(
                new URL("./", self.registration.scope).pathname,
                copy
              )
            );
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            await cache.match(request) ||
            await cache.match(
              new URL("./", self.registration.scope).pathname
            ) ||
            new Response(
              "ZUNE haiwezi kufunguka bila intaneti kwa sasa. Tafadhali unganisha intaneti kisha ujaribu tena.",
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