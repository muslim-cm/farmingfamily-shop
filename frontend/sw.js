// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v5.0
// COMPLETE FIXED VERSION
// ===========================================

const CACHE_NAME = "farming-family-v5";
const urlsToCache = [
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
  console.log("✅ Installing Service Worker v5.0...");
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

// Activate - Clean old caches
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker v5.0...");
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
      .then(() => self.clients.claim())
  );
});

// Fetch - Handle all requests
self.addEventListener("fetch", (event) => {
  // Skip API calls
  if (event.request.url.includes("/functions/v1/")) {
    return;
  }

  // For navigation requests (clicking links)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log("📱 OFFLINE: Serving from cache");

        // Try to find the page in cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("✅ Found in cache");
            return cachedResponse;
          }

          // If page not in cache, show offline page
          console.log("⚠️ Page not cached, showing offline page");
          return caches.match("/offline.html");
        });
      })
    );
    return;
  }

  // For all other requests (CSS, JS, images)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
