// ===========================================
// FARMING FAMILY SHOP - MAIN APP
// COMPLETE OFFLINE SUPPORT WITH INDEXEDDB
// ===========================================

const SUPABASE_URL = "https://vhdjqgwbeezmwllfbljp.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1`;

// ========== OFFLINE DATABASE SETUP (IndexedDB) ==========
let db;

async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FarmingFamilyOffline", 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log("✅ Offline database ready");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store products locally
      if (!db.objectStoreNames.contains("products")) {
        const store = db.createObjectStore("products", { keyPath: "id" });
        store.createIndex("category", "category");
        store.createIndex("name", "name_bengali");
      }

      // Queue for unsynced sales
      if (!db.objectStoreNames.contains("salesQueue")) {
        const salesStore = db.createObjectStore("salesQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        salesStore.createIndex("synced", "synced");
        salesStore.createIndex("createdAt", "createdAt");
      }

      // Queue for unsynced purchases
      if (!db.objectStoreNames.contains("purchasesQueue")) {
        const purchaseStore = db.createObjectStore("purchasesQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        purchaseStore.createIndex("synced", "synced");
      }

      // Queue for unsynced expenses
      if (!db.objectStoreNames.contains("expensesQueue")) {
        const expenseStore = db.createObjectStore("expensesQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        expenseStore.createIndex("synced", "synced");
      }

      // Queue for stock adjustments (damage/death)
      if (!db.objectStoreNames.contains("adjustmentsQueue")) {
        const adjStore = db.createObjectStore("adjustmentsQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        adjStore.createIndex("synced", "synced");
      }

      console.log("✅ Offline database structure created");
    };
  });
}

// Initialize database on load
initOfflineDB().catch(console.error);

// ========== OFFLINE DETECTION ==========
function isOnline() {
  return navigator.onLine;
}

window.addEventListener("online", () => {
  console.log("✅ App is online - syncing...");
  document.body.classList.remove("offline-mode");
  showNotification("অনলাইনে সংযুক্ত হয়েছে", "success");
  syncAllQueues();
});

window.addEventListener("offline", () => {
  console.log("❌ App is offline");
  document.body.classList.add("offline-mode");
  showNotification("ইন্টারনেট সংযোগ নেই। অফলাইন মোড সক্রিয়।", "warning");
});

function showNotification(message, type = "info") {
  const colors = {
    info: "#667eea",
    success: "#00b09b",
    warning: "#ff6b6b",
    error: "#ff4757"
  };

  const notification = document.createElement("div");
  notification.className = `offline-notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === "success" ? "check-circle" : type === "warning" ? "exclamation-triangle" : "info-circle"}"></i>
    <span>${message}</span>
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 15px 20px;
    border-radius: 12px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-weight: 500;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideDown 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ========== PRODUCT CACHING ==========
async function cacheProducts(products) {
  if (!db) await initOfflineDB();

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  // Clear old cache
  await store.clear();

  // Add new products
  for (const product of products) {
    await store.put(product);
  }

  await tx.done;
  console.log(`✅ ${products.length} products cached offline`);
}

async function getCachedProducts() {
  if (!db) await initOfflineDB();
  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");
  const products = await store.getAll();
  return products;
}

// ========== SYNC QUEUES ==========
async function syncAllQueues() {
  if (!isOnline()) return;
  console.log("🔄 Syncing all queues...");

  await syncQueue("salesQueue", `${API_BASE}/sales-api/sales`);
  await syncQueue("purchasesQueue", `${API_BASE}/purchases-api/purchases`);
  await syncQueue("expensesQueue", `${API_BASE}/expenses-api/expenses`);
  await syncQueue("adjustmentsQueue", `${API_BASE}/adjustments-api/adjustments`);

  showNotification("সকল ডাটা সিঙ্ক হয়েছে", "success");
}

async function syncQueue(storeName, apiEndpoint) {
  if (!db) await initOfflineDB();

  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const unsyncedItems = await store.getAll();
  await tx.done;

  const unsynced = unsyncedItems.filter((item) => !item.synced);

  for (const item of unsynced) {
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        // Mark as synced
        const writeTx = db.transaction(storeName, "readwrite");
        await writeTx.store.delete(item.localId);
        await writeTx.done;
        console.log(`✅ Synced ${storeName} item:`, item.localId);
      }
    } catch (e) {
      console.log(`❌ Failed to sync ${storeName} item:`, e);
    }
  }
}

// ========== LOGIN HANDLER (with offline check) ==========
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;

    const loginBtn = document.querySelector(".login-btn");
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> লগইন হচ্ছে...';
    loginBtn.disabled = true;

    // Offline check
    if (!isOnline()) {
      alert("⚠️ ইন্টারনেট সংযোগ নেই! অনলাইনে সংযুক্ত হয়ে আবার চেষ্টা করুন।");
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save user info
        localStorage.setItem("farming_user", JSON.stringify(data.user));
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("session_token", data.session_token);

        // Show success
        loginBtn.innerHTML = '<i class="fas fa-check"></i> সফল হয়েছে!';
        loginBtn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        throw new Error(data.error || "লগইন ব্যর্থ হয়েছে");
      }
    } catch (error) {
      alert("ত্রুটি: " + error.message);
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
    }
  });
}

// ========== PWA INSTALL PROMPT ==========
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("✅ Install prompt ready");
  showInstallButton();
});

function showInstallButton() {
  if (!document.getElementById("install-button")) {
    const installBtn = document.createElement("button");
    installBtn.id = "install-button";
    installBtn.innerHTML = "📲 অ্যাপ ইনস্টল করুন";
    installBtn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 15px 25px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
      z-index: 9999;
      border: 2px solid white;
      animation: pulse 2s infinite;
    `;
    document.body.appendChild(installBtn);

    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) {
        alert("Install prompt not ready yet.");
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`✅ User response: ${outcome}`);

      deferredPrompt = null;
      installBtn.remove();
    });
  }
}

window.addEventListener("appinstalled", () => {
  console.log("✅ PWA installed");
  const installBtn = document.getElementById("install-button");
  if (installBtn) installBtn.remove();
  deferredPrompt = null;
});

// ========== SERVICE WORKER REGISTRATION ==========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/frontend/sw.js")
      .then(function (registration) {
        console.log("✅ Service Worker registered");

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 New service worker installing...");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showNotification("অ্যাপ আপডেট হয়েছে। রিফ্রেশ করুন।", "info");
            }
          });
        });
      })
      .catch(function (error) {
        console.log("❌ Service Worker failed:", error);
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_NOW") {
        syncAllQueues();
      }
    });
  });
}

// ========== BACKGROUND SYNC SETUP ==========
if ("serviceWorker" in navigator && "SyncManager" in window) {
  navigator.serviceWorker.ready.then((registration) => {
    setInterval(
      () => {
        if (isOnline()) {
          registration.sync.register("sync-sales").catch(console.log);
        }
      },
      5 * 60 * 1000
    ); // Try every 5 minutes
  });
}

// ========== EXPORT FUNCTIONS FOR OTHER SCRIPTS ==========
window.offlineDB = {
  cacheProducts,
  getCachedProducts,
  syncAllQueues,
  isOnline,
  getDB: () => db
};

// ========== SERVICE WORKER REGISTRATION ==========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/sw.js") // ← CHANGE THIS FROM "/frontend/sw.js"
      .then(function (registration) {
        console.log("✅ Service Worker registered");

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 New service worker installing...");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showNotification("অ্যাপ আপডেট হয়েছে। রিফ্রেশ করুন।", "info");
            }
          });
        });
      })
      .catch(function (error) {
        console.log("❌ Service Worker failed:", error);
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_NOW") {
        syncAllQueues();
      }
    });
  });
}
