// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v7.0
// FORCE CACHE HTML FILES FOR OFFLINE NAVIGATION
// ===========================================

const CACHE_NAME = "farming-family-v7";
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

// Install - Force cache ALL files including HTML
self.addEventListener("install", (event) => {
  console.log("✅ Installing Service Worker v7.0 with HTML files...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Caching ALL files including HTML...");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches and take control immediately
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker v7.0...");
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("✅ Deleting old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      }),
      self.clients.claim()
    ]).then(() => {
      console.log("✅ Service Worker now controls all clients");
    })
  );
});

// Fetch - Cache first, then network
self.addEventListener("fetch", (event) => {
  // Skip API calls
  if (event.request.url.includes("/functions/v1/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
        });
    })
  );
});
