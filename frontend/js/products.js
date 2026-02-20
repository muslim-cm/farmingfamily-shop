// ===========================================
// FARMING FAMILY SHOP - PRODUCT MANAGEMENT
// COMPLETE OFFLINE SUPPORT WITH INDEXEDDB
// FIXED: Modal close button error
// ===========================================

const SUPABASE_URL = "https://vhdjqgwbeezmwllfbljp.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1`;

// ===== CHECK USER ROLE =====
const testUser = localStorage.getItem("farming_user") || localStorage.getItem("user");
console.log("🔍 RAW user data:", testUser);

// Check authentication and permissions
const userStr = localStorage.getItem("farming_user") || localStorage.getItem("user");
if (!userStr) {
  window.location.href = "index.html";
}

const currentUser = JSON.parse(userStr);
console.log("👤 Current user:", currentUser);
console.log("👑 Is Owner?", currentUser.role === "owner");
console.log("🟡 Is Manager?", currentUser.role === "manager");
console.log("🔵 Is Cashier?", currentUser.role === "cashier");

const isAdmin = currentUser.role === "owner" || currentUser.role === "manager";
const isOwner = currentUser.role === "owner";

// Redirect cashier - they can't access products page
if (currentUser.role === "cashier") {
  window.location.href = "sales.html";
}

console.log("✅ isAdmin:", isAdmin, "isOwner:", isOwner);

// ========== DOM ELEMENTS ==========
const productsList = document.getElementById("productsList");
const searchInput = document.getElementById("searchProduct");
const addProductBtn = document.getElementById("addProductBtn");
const productModal = document.getElementById("productModal");
const modalTitle = document.getElementById("modalTitle");
const productForm = document.getElementById("productForm");
const closeModal = document.getElementById("closeModal");
const unitType = document.getElementById("unitType");
const avgWeightRow = document.getElementById("avgWeightRow");

// ========== OFFLINE DATABASE SETUP ==========
let db = null;

async function getDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FarmingFamilyOffline", 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("products")) {
        const store = db.createObjectStore("products", { keyPath: "id" });
        store.createIndex("category", "category");
        store.createIndex("name", "name_bengali");
      }

      if (!db.objectStoreNames.contains("productsQueue")) {
        const store = db.createObjectStore("productsQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        store.createIndex("synced", "synced");
        store.createIndex("action", "action");
      }
    };
  });
}

// ========== OFFLINE DETECTION ==========
function isOnline() {
  return navigator.onLine;
}

function showOfflineMessage() {
  const content = document.querySelector(".content");
  if (content && !document.getElementById("offline-banner")) {
    const banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.innerHTML = `
      <i class="fas fa-wifi-slash"></i>
      <span>আপনি অফলাইনে আছেন। পণ্য ক্যাশে থেকে দেখানো হচ্ছে। পরিবর্তনগুলি পরবর্তীতে সিঙ্ক হবে।</span>
    `;
    banner.style.cssText = `
      background: #ff6b6b;
      color: white;
      padding: 12px;
      text-align: center;
      margin-bottom: 15px;
      border-radius: 10px;
      font-size: 14px;
    `;
    content.prepend(banner);
  }
}

// ========== CACHE PRODUCTS OFFLINE ==========
async function cacheProducts(products) {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    await store.clear();
    for (const product of products) {
      await store.put(product);
    }
    await tx.done;
    console.log(`✅ ${products.length} products cached offline`);
  } catch (error) {
    console.error("Error caching products:", error);
  }
}

// ========== LOAD PRODUCTS (OFFLINE-FIRST) ==========
async function loadProducts(searchTerm = "") {
  if (!productsList) {
    console.error("productsList element not found");
    return;
  }

  productsList.innerHTML = `
    <tr>
      <td colspan="7" class="text-center loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>পণ্যের তালিকা লোড হচ্ছে...</p>
      </td>
    </tr>
  `;

  let products = [];

  // Try online first
  if (isOnline()) {
    try {
      let url = `${API_BASE}/products-api/products`;
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        products = data.data;
        await cacheProducts(products);
        displayProducts(products);
        return;
      }
    } catch (error) {
      console.log("Online fetch failed, loading from cache...");
    }
  }

  // Offline - load from cache
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");
    let products = await store.getAll();

    // Apply search filter if needed
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(
        (p) =>
          p.name_bengali.toLowerCase().includes(term) ||
          (p.name_english && p.name_english.toLowerCase().includes(term))
      );
    }

    if (products.length > 0) {
      showOfflineMessage();
      displayProducts(products);
    } else {
      productsList.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 40px; color: #666;">
            <i class="fas fa-wifi-slash" style="font-size: 40px; margin-bottom: 15px;"></i>
            <p>অফলাইনে কোন পণ্য পাওয়া যায়নি। অনলাইনে সংযুক্ত হয়ে আবার চেষ্টা করুন।</p>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Error loading from cache:", error);
    productsList.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="color: #ff6b6b; padding: 40px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 40px; margin-bottom: 15px;"></i>
          <p>পণ্যের তালিকা লোড করতে সমস্যা হয়েছে</p>
          <button onclick="loadProducts()" style="margin-top: 15px; padding: 8px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-redo"></i> আবার চেষ্টা করুন
          </button>
        </td>
      </tr>
    `;
  }
}

// ========== DISPLAY PRODUCTS ==========
function displayProducts(products) {
  if (!products || products.length === 0) {
    productsList.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 40px; color: #666;">
          <i class="fas fa-box-open" style="font-size: 40px; margin-bottom: 15px;"></i>
          <p>কোনো পণ্য পাওয়া যায়নি</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  products.forEach((product) => {
    const stockStatus =
      product.current_quantity <= product.min_stock ? "stock-low" : "stock-normal";
    const stockText = product.current_quantity <= product.min_stock ? "স্টক কম" : "পর্যাপ্ত";

    let unitDisplay =
      product.unit_type === "piece" ? "পিস" : product.unit_type === "weight" ? "কেজি" : "পিস/কেজি";

    html += `
      <tr>
        <td>
          <strong>${product.name_bengali}</strong>
          <br>
          <small style="color: #666;">${product.name_english || ""}</small>
        </td>
        <td><span class="category-badge">${product.category}</span></td>
        <td><strong>${product.selling_price} টাকা</strong></td>
        <td class="${stockStatus}"><strong>${product.current_quantity}</strong></td>
        <td>${unitDisplay}</td>
        <td><span style="color: ${product.current_quantity <= product.min_stock ? "#ff6b6b" : "#00b09b"};">${stockText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="editProduct('${product.id}')">
              <i class="fas fa-edit"></i> সম্পাদনা
            </button>
            ${
              isOwner
                ? `<button class="btn-delete" onclick="deleteProduct('${product.id}')" style="background: #ff6b6b; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; margin-left: 5px;">
                    <i class="fas fa-trash"></i> মুছুন
                  </button>`
                : ""
            }
          </div>
        </td>
      </tr>
    `;
  });

  productsList.innerHTML = html;
}

// ========== ADD NEW PRODUCT ==========
function openAddModal() {
  if (!modalTitle || !productForm || !productModal) {
    console.error("Modal elements not found");
    return;
  }
  modalTitle.textContent = "নতুন পণ্য যোগ করুন";
  productForm.reset();
  document.getElementById("productId").value = "";
  productModal.classList.add("active");
}

// ========== EDIT PRODUCT (OFFLINE-FIRST) ==========
async function editProduct(productId) {
  // Try online first
  if (isOnline()) {
    try {
      const response = await fetch(`${API_BASE}/products-api/products/${productId}`);
      const data = await response.json();

      if (data.success && data.data) {
        fillEditForm(data.data);
        return;
      }
    } catch (error) {
      console.log("Online fetch failed, trying cache...");
    }
  }

  // Offline - load from cache
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");
    const product = await store.get(productId);

    if (product) {
      fillEditForm(product);
      showOfflineMessage();
    } else {
      alert("অফলাইনে পণ্যের তথ্য পাওয়া যায়নি");
    }
  } catch (error) {
    console.error("Error loading product:", error);
    alert("পণ্যের তথ্য লোড করতে সমস্যা হয়েছে");
  }
}

function fillEditForm(product) {
  if (!modalTitle || !productForm || !productModal) {
    console.error("Modal elements not found");
    return;
  }

  modalTitle.textContent = "পণ্য সম্পাদনা করুন";

  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name_bengali || "";
  document.getElementById("productNameEn").value = product.name_english || "";
  document.getElementById("category").value = product.category || "";
  document.getElementById("sellingPrice").value = product.selling_price || 0;
  document.getElementById("purchasePrice").value = product.purchase_price || 0;
  document.getElementById("currentStock").value = product.current_quantity || 0;
  document.getElementById("minStock").value = product.min_stock || 10;
  document.getElementById("unitType").value = product.unit_type || "piece";
  document.getElementById("avgWeight").value = product.avg_weight || "";

  if (product.unit_type === "both" || product.category === "পাখি ও বাচ্চা") {
    avgWeightRow.style.display = "block";
  } else {
    avgWeightRow.style.display = "none";
  }

  productModal.classList.add("active");
}

// ========== DELETE PRODUCT (OFFLINE-FIRST) ==========
async function deleteProduct(productId) {
  if (!isOwner) {
    alert("শুধুমাত্র মালিক পণ্য মুছতে পারবেন");
    return;
  }

  if (!confirm("আপনি কি নিশ্চিত? এই পণ্য মুছে ফেলা হবে।")) {
    return;
  }

  // Online - delete immediately
  if (isOnline()) {
    try {
      const response = await fetch(`${API_BASE}/products-api/products/${productId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ পণ্য সফলভাবে মুছে ফেলা হয়েছে");
        await removeProductFromCache(productId);
        loadProducts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("পণ্য মুছতে সমস্যা হয়েছে");
    }
    return;
  }

  // Offline - queue the delete
  try {
    const db = await getDB();
    const tx = db.transaction("productsQueue", "readwrite");

    const queueItem = {
      productId: productId,
      action: "delete",
      synced: false,
      createdAt: new Date().toISOString()
    };

    await tx.store.add(queueItem);
    await tx.done;

    // Remove from local cache
    await removeProductFromCache(productId);

    alert("✅ পণ্য অফলাইনে মুছে ফেলা হয়েছে। অনলাইনে সংযুক্ত হলে সিঙ্ক হবে।");
    loadProducts(); // Reload from cache
  } catch (error) {
    console.error("Queue error:", error);
    alert("অফলাইনে মুছতে সমস্যা হয়েছে");
  }
}

async function removeProductFromCache(productId) {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    await tx.store.delete(productId);
    await tx.done;
  } catch (error) {
    console.error("Error removing from cache:", error);
  }
}

// ========== SAVE PRODUCT (OFFLINE-FIRST) ==========
productForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const productId = document.getElementById("productId").value;
  const isEdit = !!productId;

  const productData = {
    name_bengali: document.getElementById("productName").value,
    name_english: document.getElementById("productNameEn").value,
    category: document.getElementById("category").value,
    selling_price: parseFloat(document.getElementById("sellingPrice").value) || 0,
    purchase_price: parseFloat(document.getElementById("purchasePrice").value) || null,
    current_quantity: parseFloat(document.getElementById("currentStock").value) || 0,
    min_stock: parseFloat(document.getElementById("minStock").value) || 10,
    unit_type: document.getElementById("unitType").value,
    available_units: getAvailableUnits(document.getElementById("unitType").value),
    avg_weight:
      document.getElementById("unitType").value === "both"
        ? parseFloat(document.getElementById("avgWeight").value) || null
        : null
  };

  const saveBtn = productForm.querySelector(".btn-save");
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
  saveBtn.disabled = true;

  // ========== ONLINE MODE ==========
  if (isOnline()) {
    try {
      let url = `${API_BASE}/products-api/products`;
      let method = "POST";

      if (isEdit) {
        url = `${API_BASE}/products-api/products/${productId}`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (data.success) {
        alert(isEdit ? "✅ পণ্য আপডেট করা হয়েছে" : "✅ নতুন পণ্য যোগ করা হয়েছে");

        // Update cache
        if (isEdit) {
          await updateProductInCache(productId, productData);
        } else {
          await addProductToCache(data.data);
        }

        productModal.classList.remove("active");
        loadProducts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error saving product:", error);

      // If network error, queue it
      if (!isOnline() || error.message.includes("network")) {
        await queueProductForSync(productData, isEdit ? "update" : "add", productId);
        alert(
          isEdit
            ? "✅ পণ্য অফলাইনে আপডেট হয়েছে। অনলাইনে সংযুক্ত হলে সিঙ্ক হবে।"
            : "✅ পণ্য অফলাইনে যোগ হয়েছে। অনলাইনে সংযুক্ত হলে সিঙ্ক হবে।"
        );
        productModal.classList.remove("active");
        loadProducts();
      } else {
        alert("পণ্য সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
      }
    }
  }
  // ========== OFFLINE MODE ==========
  else {
    await queueProductForSync(productData, isEdit ? "update" : "add", productId);
    alert(
      isEdit
        ? "✅ পণ্য অফলাইনে আপডেট হয়েছে। অনলাইনে সংযুক্ত হলে সিঙ্ক হবে।"
        : "✅ পণ্য অফলাইনে যোগ হয়েছে। অনলাইনে সংযুক্ত হলে সিঙ্ক হবে।"
    );
    productModal.classList.remove("active");
    loadProducts(); // Reload from cache
  }

  saveBtn.innerHTML = originalText;
  saveBtn.disabled = false;
});

// ========== QUEUE PRODUCT FOR SYNC ==========
async function queueProductForSync(productData, action, productId = null) {
  try {
    const db = await getDB();
    const tx = db.transaction("productsQueue", "readwrite");

    // Add to local products store first
    const productTx = db.transaction("products", "readwrite");
    const productStore = productTx.objectStore("products");

    if (action === "delete") {
      await productStore.delete(productId);
    } else {
      // For add/update, create a temporary ID if needed
      const tempProduct = {
        ...productData,
        id: productId || `temp_${Date.now()}_${Math.random()}`,
        is_temp: !productId,
        synced: false
      };
      await productStore.put(tempProduct);
    }
    await productTx.done;

    // Queue the action
    const queueItem = {
      productId: productId || `temp_${Date.now()}`,
      data: productData,
      action: action,
      synced: false,
      createdAt: new Date().toISOString()
    };

    await tx.store.add(queueItem);
    await tx.done;

    console.log(`✅ Product ${action} queued for sync`);
  } catch (error) {
    console.error("Error queueing product:", error);
    throw error;
  }
}

async function updateProductInCache(productId, productData) {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    const product = { ...productData, id: productId };
    await tx.store.put(product);
    await tx.done;
  } catch (error) {
    console.error("Error updating cache:", error);
  }
}

async function addProductToCache(product) {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    await tx.store.put(product);
    await tx.done;
  } catch (error) {
    console.error("Error adding to cache:", error);
  }
}

// ========== GET AVAILABLE UNITS ==========
function getAvailableUnits(unitType) {
  switch (unitType) {
    case "piece":
      return [
        { unit: "pc", conversion: 1 },
        { unit: "cage", conversion: 30 },
        { unit: "হালি", conversion: 4 },
        { unit: "ডজন", conversion: 12 }
      ];
    case "weight":
      return [{ unit: "kg", conversion: 1 }];
    case "both":
      return [
        { unit: "pc", conversion: 1 },
        { unit: "kg", conversion: 1 }
      ];
    default:
      return [{ unit: "pc", conversion: 1 }];
  }
}

// ========== TOGGLE AVG WEIGHT FIELD ==========
if (unitType) {
  unitType.addEventListener("change", function () {
    if (this.value === "both") {
      avgWeightRow.style.display = "block";
    } else {
      avgWeightRow.style.display = "none";
      document.getElementById("avgWeight").value = "";
    }
  });
}

// ========== SEARCH PRODUCTS ==========
if (searchInput) {
  searchInput.addEventListener(
    "input",
    debounce(function () {
      loadProducts(this.value);
    }, 500)
  );
}

// ========== DEBOUNCE FUNCTION ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== MODAL CONTROLS ==========
if (addProductBtn) {
  addProductBtn.addEventListener("click", openAddModal);
}

// FIXED: Safely add event listener to closeModal
if (closeModal) {
  closeModal.addEventListener("click", () => {
    if (productModal) {
      productModal.classList.remove("active");
    }
  });
} else {
  console.log("closeModal element not found - this is normal on first load");
}

// Close modal when clicking outside
window.addEventListener("click", function (e) {
  if (e.target === productModal) {
    productModal.classList.remove("active");
  }
});

// ========== SYNC QUEUE WHEN ONLINE ==========
async function syncProductsQueue() {
  if (!isOnline()) return;

  try {
    const db = await getDB();
    const tx = db.transaction("productsQueue", "readonly");
    const store = tx.objectStore("productsQueue");
    const queue = await store.getAll();
    await tx.done;

    const unsynced = queue.filter((item) => !item.synced);

    for (const item of unsynced) {
      try {
        let url = `${API_BASE}/products-api/products`;
        let method = "POST";

        if (item.action === "update" || item.action === "delete") {
          url = `${API_BASE}/products-api/products/${item.productId}`;
          method = item.action === "delete" ? "DELETE" : "PATCH";
        }

        const response = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: item.action !== "delete" ? JSON.stringify(item.data) : undefined
        });

        if (response.ok) {
          // Remove from queue
          const writeTx = db.transaction("productsQueue", "readwrite");
          await writeTx.store.delete(item.localId);
          await writeTx.done;
          console.log(`✅ Synced product ${item.action}`);
        }
      } catch (error) {
        console.log(`Failed to sync product:`, error);
      }
    }
  } catch (error) {
    console.error("Error syncing queue:", error);
  }
}

// Listen for online event
window.addEventListener("online", syncProductsQueue);

// ========== INITIAL LOAD ==========
loadProducts();

// Make functions global for onclick handlers
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.loadProducts = loadProducts;
window.syncProductsQueue = syncProductsQueue;

console.log("✅ Products.js loaded with complete offline support");
