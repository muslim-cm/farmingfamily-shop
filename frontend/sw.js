// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v4.0
// WITH NAVIGATION INTERCEPTION
// ===========================================

const CACHE_NAME = "farming-family-v4";
const urlsToCache = [
  "/frontend/index.html",
  "/frontend/dashboard.html",
  "/frontend/sales.html",
  "/frontend/products.html",
  "/frontend/expenses.html",
  "/frontend/reports.html",
  "/frontend/offline.html",
  "/frontend/css/style.css",
  "/frontend/js/app.js",
  "/frontend/js/sales.js",
  "/frontend/js/products.js",
  "/frontend/js/expenses.js",
  "/frontend/js/reports.js",
  "/frontend/js/cash.js",
  "/frontend/manifest.json",
  "/frontend/icons/icon-48x48.png",
  "/frontend/icons/icon-72x72.png",
  "/frontend/icons/icon-96x96.png",
  "/frontend/icons/icon-128x128.png",
  "/frontend/icons/icon-192x192.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
];

// Install - Cache all files
self.addEventListener("install", (event) => {
  console.log("✅ Installing Service Worker v4...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Caching app files...");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker v4...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("✅ Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - CRITICAL: Handle navigation for offline
self.addEventListener("fetch", (event) => {
  // Skip API calls
  if (event.request.url.includes("/functions/v1/")) {
    return;
  }

  // For navigation requests (clicking links, typing URL)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log("📱 OFFLINE MODE: Serving from cache");
          
          // Try to get the requested page from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log("✅ Found in cache:", event.request.url);
                return cachedResponse;
              }
              
              // If page not in cache, serve offline.html
              console.log("⚠️ Page not cached, showing offline page");
              return caches.match("/frontend/offline.html");
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
        if (!response || response.status !== 200 || response.type !== 'basic') {
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