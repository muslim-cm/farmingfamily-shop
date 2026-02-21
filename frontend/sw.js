// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v6.0
// SIMPLIFIED - GUARANTEED TO WORK
// ===========================================

const CACHE_NAME = "farming-family-v6";
const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/sales.html",
  "/products.html",
  "/expenses.html",
  "/reports.html",
  "/cash.html",
  "/offline.html",
  "/css/style.css",
  "/js/app.js",
  "/js/sales.js",
  "/js/products.js",
  "/js/expenses.js",
  "/js/reports.js",
  "/js/cash.js",
  "/manifest.json",
  "/icons/icon-48x48.png",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-192x192.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
];

// Install - Cache all files
self.addEventListener("install", (event) => {
  console.log("✅ Installing Service Worker v6.0...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Caching app files...");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches and take control
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker v6.0...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("✅ Deleting old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker activated, taking control");
        return self.clients.claim();
      })
  );
});

// Fetch - SIMPLIFIED: Cache first, then network, then offline page
self.addEventListener("fetch", (event) => {
  // Skip API calls
  if (event.request.url.includes("/functions/v1/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        console.log("✅ Serving from cache:", event.request.url);
        return cachedResponse;
      }

      // Otherwise fetch from network
      console.log("🌐 Fetching from network:", event.request.url);
      return fetch(event.request)
        .then((networkResponse) => {
          // Don't cache if not a valid response
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache the response for next time
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.log("❌ Fetch failed, serving offline page:", error);

          // For navigation requests, serve offline page
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }

          // For other requests, just fail
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
