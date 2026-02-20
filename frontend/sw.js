// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v3.0
// FORCE CACHE ALL FILES
// ===========================================

const CACHE_NAME = "farming-family-v3";
const urlsToCache = [
  // HTML Pages
  "/frontend/index.html",
  "/frontend/dashboard.html",
  "/frontend/sales.html",
  "/frontend/products.html",
  "/frontend/expenses.html",
  "/frontend/reports.html",
  "/frontend/offline.html",

  // CSS
  "/frontend/css/style.css",

  // JavaScript
  "/frontend/js/app.js",
  "/frontend/js/sales.js",
  "/frontend/js/products.js",
  "/frontend/js/expenses.js",
  "/frontend/js/reports.js",

  // PWA
  "/frontend/manifest.json",

  // Icons
  "/frontend/icons/icon-48x48.png",
  "/frontend/icons/icon-72x72.png",
  "/frontend/icons/icon-96x96.png",
  "/frontend/icons/icon-128x128.png",
  "/frontend/icons/icon-192x192.png",

  // External (CDN)
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
];

// Install - Force cache ALL files
self.addEventListener("install", (event) => {
  console.log("✅ Installing Service Worker v3...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ Caching ALL app files...");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("✅ All files cached successfully! Total:", urlsToCache.length);
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Cache failed:", error);
        // Try to cache one by one if bulk fails
        return cacheFilesOneByOne();
      })
  );
});

// Fallback: Cache files one by one
async function cacheFilesOneByOne() {
  const cache = await caches.open(CACHE_NAME);
  let successCount = 0;

  for (const url of urlsToCache) {
    try {
      await cache.add(url);
      successCount++;
      console.log(`✅ Cached: ${url}`);
    } catch (error) {
      console.error(`❌ Failed to cache: ${url}`);
    }
  }

  console.log(`✅ Cached ${successCount}/${urlsToCache.length} files`);
  self.skipWaiting();
}

// Activate - Clean old caches
self.addEventListener("activate", (event) => {
  console.log("✅ Activating Service Worker v3...");
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
        console.log("✅ Service Worker v3 activated");
        return self.clients.claim();
      })
  );
});

// Fetch - Serve from cache first
self.addEventListener("fetch", (event) => {
  // Skip API calls
  if (event.request.url.includes("/functions/v1/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        console.log("✅ Serving from cache:", event.request.url);
        return response;
      }

      // Otherwise fetch from network
      console.log("🌐 Fetching from network:", event.request.url);
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache the response for next time
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.log("❌ Fetch failed, serving offline page");

          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/frontend/offline.html");
          }
        });
    })
  );
});
