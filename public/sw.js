/* public/sw.js */
/* Minimal, safe SW: no workbox, no precache of Next build manifests */

const CACHE_NAME = "bondiq-static-v1";

// Only cache simple, stable assets you control.
// (Keep this list small to avoid “deceptive” caching patterns.)
const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/logo.png",
  "/logo-mark.png",
  "/apple-touch-icon.png",
  "/landing/couple-hero.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Network-first for HTML navigations (keeps app fresh).
// Cache-first for same-origin static assets (icons/images/etc).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // Only same-origin
  if (url.origin !== self.location.origin) return;

  // Never cache API responses
  if (url.pathname.startsWith("/api/")) return;

  // Never mess with Next.js internal build resources
  if (url.pathname.startsWith("/_next/")) return;

  // Navigations: network first, fallback to cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match("/");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Static files: cache first
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Cache only “basic” successful responses
        if (res && res.ok && res.type === "basic") {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
