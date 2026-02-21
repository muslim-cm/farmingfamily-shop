// ===========================================
// FARMING FAMILY SHOP - SERVICE WORKER v7.0
// FORCE CACHE HTML FILES
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
      .then(() => {
        console.log("✅ All files cached successfully!");
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
  console.log("✅ Activating Service Worker v7.0...");
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
        console.log("✅ Service Worker activated");
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

  // For HTML navigation - CRITICAL
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log("📱 OFFLINE: Trying cache for navigation");
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("✅ Found HTML in cache:", event.request.url);
            return cachedResponse;
          }
          console.log("⚠️ HTML not cached, showing offline page");
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
      return fetch(event.request);
    })
  );
});
