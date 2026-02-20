// ===========================================
// FARMING FAMILY SHOP - SALES ENTRY
// COMPLETE OFFLINE SUPPORT WITH INDEXEDDB
// ===========================================

const SUPABASE_URL = "https://vhdjqgwbeezmwllfbljp.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1`;

// Check authentication
const userStr = localStorage.getItem("farming_user") || localStorage.getItem("user");
if (!userStr) window.location.href = "index.html";
const currentUser = JSON.parse(userStr);

let cart = [];
let products = [];
let db = null;

// DOM Elements
const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("categoryFilter");
const searchResults = document.getElementById("productSearchResults");
const cartItems = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const discountInput = document.getElementById("discountInput");
const grandTotalEl = document.getElementById("grandTotal");
const cashReceived = document.getElementById("cashReceived");
const changeAmount = document.getElementById("changeAmount");
const saveSaleBtn = document.getElementById("saveSaleBtn");

// ========== OFFLINE DATABASE CONNECTION ==========
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
        db.createObjectStore("products", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("salesQueue")) {
        const store = db.createObjectStore("salesQueue", {
          keyPath: "localId",
          autoIncrement: true
        });
        store.createIndex("synced", "synced");
      }
    };
  });
}

// ========== OFFLINE MODE CHECK ==========
function isOnline() {
  return navigator.onLine;
}

// Show offline message but don't block completely
function showOfflineMessage() {
  const content = document.querySelector(".content");
  if (content && !document.getElementById("offline-banner")) {
    const banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.innerHTML = `
      <i class="fas fa-wifi-slash"></i>
      <span>আপনি অফলাইনে আছেন। পণ্য ক্যাশে থেকে দেখানো হচ্ছে।</span>
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

// ========== LOAD PRODUCTS (OFFLINE-FIRST) ==========
async function loadProducts() {
  // Try online first
  if (isOnline()) {
    try {
      const response = await fetch(`${API_BASE}/products-api/products`);
      const data = await response.json();
      if (data.success) {
        products = data.data;
        console.log("✅ Products loaded from server:", products.length);

        // Cache products offline
        try {
          const db = await getDB();
          const tx = db.transaction("products", "readwrite");
          const store = tx.objectStore("products");
          await store.clear();
          for (const product of products) {
            await store.put(product);
          }
          await tx.done;
          console.log("✅ Products cached offline");
        } catch (e) {
          console.log("Cache error:", e);
        }

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
    products = await store.getAll();
    console.log("✅ Products loaded from cache:", products.length);

    if (products.length > 0) {
      showOfflineMessage();
    } else {
      // No cached products - show error
      const content = document.querySelector(".content");
      if (content) {
        content.innerHTML = `
          <div style="text-align:center; padding:40px; background:white; border-radius:15px;">
            <i class="fas fa-wifi-slash" style="font-size:60px; color:#ff6b6b; margin-bottom:20px;"></i>
            <h2 style="color:#333; margin-bottom:15px;">ইন্টারনেট সংযোগ নেই</h2>
            <p style="color:#666; margin-bottom:20px;">আপনি অফলাইনে আছেন এবং কোন ক্যাশেড পণ্য নেই। অনলাইনে সংযুক্ত হয়ে আবার চেষ্টা করুন।</p>
            <button onclick="location.reload()" style="background:#667eea; color:white; border:none; padding:12px 30px; border-radius:10px; font-size:16px;">
              <i class="fas fa-redo-alt"></i> পুনরায় চেষ্টা করুন
            </button>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Error loading from cache:", error);
  }
}

// ========== SEARCH PRODUCTS ==========
function searchProducts() {
  const searchTerm = productSearch.value.toLowerCase();
  const category = categoryFilter.value;

  let filtered = products.filter((p) => p.is_active !== false);

  if (searchTerm) {
    filtered = filtered.filter(
      (p) =>
        p.name_bengali.toLowerCase().includes(searchTerm) ||
        (p.name_english && p.name_english.toLowerCase().includes(searchTerm))
    );
  }

  if (category) filtered = filtered.filter((p) => p.category === category);

  displaySearchResults(filtered);
}

// ========== DISPLAY SEARCH RESULTS ==========
function displaySearchResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML =
      '<p style="text-align:center; color:#666; padding:20px;"><i class="fas fa-box-open"></i> কোন পণ্য পাওয়া যায়নি</p>';
    return;
  }

  // Desktop header (hidden on mobile)
  let html =
    '<div class="product-row-header" style="display: grid; grid-template-columns: 2fr 1fr 1.2fr 1fr 0.8fr 1fr 0.8fr; gap: 10px; background: #667eea; color: white; padding: 12px 15px; border-radius: 10px; margin-bottom: 10px;">';
  html +=
    "<span>পণ্য</span><span>ইউনিট</span><span>ক্রয় মূল্য</span><span>বিক্রয় মূল্য</span><span>স্টক</span><span>পরিমাণ</span><span></span>";
  html += "</div>";

  results.forEach((product) => {
    const purchasePrice = product.purchase_price || 0;
    const defaultPrice = purchasePrice > 0 ? Math.ceil(purchasePrice * 1.2) : product.selling_price;
    const stockStatus = product.current_quantity <= product.min_stock ? "stock-low" : "";
    const stockText =
      product.current_quantity <= product.min_stock ? "স্টক কম" : `${product.current_quantity}`;

    html += `
            <div class="product-row">
                <div><strong>${product.name_bengali}</strong><br><small style="color:#666;">${product.name_english || ""}</small></div>
                <div>
                    <select id="unit_${product.id}" class="unit-select">
                        ${getUnitOptions(product.available_units)}
                    </select>
                </div>
                <div>
                    <small style="color:#666;">ক্রয়: ${purchasePrice.toFixed(2)} টাকা</small>
                    <br>
                    <small style="color:#00b09b;">সুপারিশ: ${defaultPrice.toFixed(2)} টাকা</small>
                </div>
                <div>
                    <input type="number" id="price_${product.id}" value="${defaultPrice.toFixed(2)}" min="0" step="0.05" style="padding:8px; border:2px solid #e0e0e0; border-radius:5px; width:100%;">
                </div>
                <div class="${stockStatus}">${stockText}</div>
                <div>
                    <input type="number" id="qty_${product.id}" min="0.10" step="0.10" value="1.00" style="padding:8px; border:2px solid #e0e0e0; border-radius:5px; width:100%;">
                </div>
                <div>
                    <button onclick="addToCart('${product.id}')" style="background:#667eea; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; width:100%;">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
  });

  searchResults.innerHTML = html;
  setDataLabels();
}

// ========== GET UNIT OPTIONS ==========
function getUnitOptions(availableUnits) {
  if (!availableUnits) return '<option value="pc">পিস</option>';
  let options = "";
  availableUnits.forEach((u) => {
    let display =
      u.unit === "pc" ? "পিস" : u.unit === "kg" ? "কেজি" : u.unit === "cage" ? "কেজ" : u.unit;
    options += `<option value="${u.unit}" data-conversion="${u.conversion}">${display}</option>`;
  });
  return options;
}

// ========== ADD TO CART ==========
window.addToCart = function (productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const unitSelect = document.getElementById(`unit_${productId}`);
  const unit = unitSelect.value;
  const conversion = parseFloat(unitSelect.selectedOptions[0].dataset.conversion || 1);
  const price =
    parseFloat(document.getElementById(`price_${productId}`).value) || product.selling_price;
  let qty = parseFloat(document.getElementById(`qty_${productId}`).value) || 1;
  if (qty < 0.1) qty = 0.1;

  const baseQty = qty * conversion;

  // Skip stock check if offline (can't verify)
  if (isOnline() && baseQty > product.current_quantity) {
    alert(`⚠️ পর্যাপ্ত স্টক নেই! বর্তমান: ${product.current_quantity}`);
    return;
  }

  const existing = cart.find((item) => item.product_id === productId && item.unit === unit);

  if (existing) {
    existing.qty += qty;
    existing.baseQty += baseQty;
    existing.total = existing.baseQty * existing.price;
  } else {
    cart.push({
      product_id: productId,
      name: product.name_bengali,
      unit: unit,
      conversion: conversion,
      qty: qty,
      baseQty: baseQty,
      price: price,
      purchase_price: product.purchase_price,
      discount: 0,
      total: baseQty * price
    });
  }

  displayCart();
  document.getElementById(`qty_${productId}`).value = "1.00";
};

// ========== DISPLAY CART ==========
function displayCart() {
  if (cart.length === 0) {
    cartItems.innerHTML =
      '<p style="text-align:center; color:#666; padding:20px;"><i class="fas fa-box-open"></i> কার্ট খালি</p>';
    subtotalEl.textContent = "0.00";
    grandTotalEl.textContent = "0.00";
    return;
  }

  let html = "";
  let subtotal = 0;

  cart.forEach((item, index) => {
    subtotal += item.total;
    const profit = item.price - (item.purchase_price || 0);
    const margin = item.purchase_price ? ((profit / item.purchase_price) * 100).toFixed(0) : "—";

    html += `
            <div class="cart-item">
                <div><strong>${item.name}</strong><br><small style="color:#666;">${item.qty.toFixed(2)} ${item.unit}</small></div>
                <div>${item.baseQty.toFixed(2)}</div>
                <div>${item.price.toFixed(2)}</div>
                <div><strong>${item.total.toFixed(2)}</strong></div>
                <div>
                    <input type="number" id="discount_item_${index}" value="${item.discount.toFixed(2)}" min="0" step="0.05" style="width:70px; padding:5px; border:2px solid #e0e0e0; border-radius:5px;" onchange="updateItemDiscount(${index}, this.value)">
                </div>
                <div>
                    <button class="btn-remove" onclick="removeFromCart(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
  });

  cartItems.innerHTML = html;
  subtotalEl.textContent = subtotal.toFixed(2);
  calculateGrandTotal();
  setDataLabels();
}

// ========== REMOVE FROM CART ==========
window.removeFromCart = function (index) {
  cart.splice(index, 1);
  displayCart();
};

// ========== UPDATE ITEM DISCOUNT ==========
window.updateItemDiscount = function (index, discount) {
  if (cart[index]) {
    cart[index].discount = parseFloat(discount) || 0;
    cart[index].total = cart[index].baseQty * cart[index].price - cart[index].discount;
    displayCart();
  }
};

// ========== CALCULATE GRAND TOTAL ==========
function calculateGrandTotal() {
  const subtotal = parseFloat(subtotalEl.textContent) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  grandTotalEl.textContent = Math.max(0, subtotal - discount).toFixed(2);
  calculateChange();
}

// ========== CALCULATE CHANGE ==========
function calculateChange() {
  const total = parseFloat(grandTotalEl.textContent) || 0;
  const cash = parseFloat(cashReceived.value) || 0;
  changeAmount.textContent = cash >= total ? (cash - total).toFixed(2) : "0.00";
}

// ========== SAVE SALE (OFFLINE-FIRST) ==========
window.saveSale = async function () {
  if (cart.length === 0) {
    alert("⚠️ কার্ট খালি! কমপক্ষে একটি পণ্য যোগ করুন");
    return;
  }

  const subtotal = parseFloat(subtotalEl.textContent) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const total = parseFloat(grandTotalEl.textContent) || 0;
  const cash = parseFloat(cashReceived.value) || 0;

  if (cash < total) {
    alert(`⚠️ প্রদত্ত টাকা কম! বাকি: ${(total - cash).toFixed(2)} টাকা`);
    return;
  }

  const saleData = {
    customer_name: document.getElementById("customerName").value || null,
    customer_phone: document.getElementById("customerPhone").value || null,
    subtotal: subtotal,
    discount_total: discount,
    total_amount: total,
    cash_received: cash,
    change_amount: cash - total,
    created_by: currentUser.username,
    created_at: new Date().toISOString(),
    items: cart.map((item) => ({
      product_id: item.product_id,
      selling_unit: item.unit,
      quantity_in_unit: item.qty,
      quantity_in_base: item.baseQty,
      weight_sold: item.unit === "kg" ? item.baseQty : null,
      unit_price: item.price,
      discount: item.discount,
      total_price: item.total
    }))
  };

  const btn = document.getElementById("saveSaleBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
  btn.disabled = true;

  // ========== OFFLINE MODE - QUEUE THE SALE ==========
  if (!isOnline()) {
    try {
      const db = await getDB();
      const tx = db.transaction("salesQueue", "readwrite");

      const queueItem = {
        data: saleData,
        synced: false,
        createdAt: new Date().toISOString(),
        retryCount: 0
      };

      const id = await tx.store.add(queueItem);
      await tx.done;

      alert(
        "✅ বিক্রয় অফলাইনে সংরক্ষিত হয়েছে। ইন্টারনেট সংযুক্ত হলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
      );

      // Clear cart
      cart = [];
      displayCart();
      document.getElementById("customerName").value = "";
      document.getElementById("customerPhone").value = "";
      discountInput.value = "0.00";
      cashReceived.value = "";
      changeAmount.textContent = "0.00";

      btn.innerHTML = '<i class="fas fa-save"></i> বিক্রয় সংরক্ষণ করুন';
      btn.disabled = false;
      return;
    } catch (error) {
      console.error("Queue error:", error);
      alert("❌ অফলাইনে সংরক্ষণ করতে সমস্যা হয়েছে");
      btn.innerHTML = '<i class="fas fa-save"></i> বিক্রয় সংরক্ষণ করুন';
      btn.disabled = false;
      return;
    }
  }

  // ========== ONLINE MODE - NORMAL SAVE ==========
  try {
    const response = await fetch(`${API_BASE}/sales-api/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData)
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ বিক্রয় সংরক্ষণ করা হয়েছে!`);
      cart = [];
      displayCart();
      document.getElementById("customerName").value = "";
      document.getElementById("customerPhone").value = "";
      discountInput.value = "0.00";
      cashReceived.value = "";
      changeAmount.textContent = "0.00";
      await loadProducts(); // Refresh stock levels
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    // If online save fails (network error), queue it
    if (!isOnline() || error.message.includes("network")) {
      try {
        const db = await getDB();
        const tx = db.transaction("salesQueue", "readwrite");

        const queueItem = {
          data: saleData,
          synced: false,
          createdAt: new Date().toISOString(),
          retryCount: 0
        };

        await tx.store.add(queueItem);
        await tx.done;

        alert(
          "✅ নেটওয়ার্ক সমস্যার কারণে বিক্রয় অফলাইনে সংরক্ষিত হয়েছে। পরে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
        );

        cart = [];
        displayCart();
        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        discountInput.value = "0.00";
        cashReceived.value = "";
        changeAmount.textContent = "0.00";
      } catch (e) {
        alert("❌ ত্রুটি: " + error.message);
      }
    } else {
      alert("❌ ত্রুটি: " + error.message);
    }
  } finally {
    btn.innerHTML = '<i class="fas fa-save"></i> বিক্রয় সংরক্ষণ করুন';
    btn.disabled = false;
  }
};

// ========== SET DATA LABELS FOR MOBILE ==========
function setDataLabels() {
  document.querySelectorAll(".product-row").forEach((row) => {
    const divs = row.querySelectorAll("div");
    if (divs.length >= 6) {
      divs[0]?.setAttribute("data-label", "📦 পণ্য");
      divs[1]?.setAttribute("data-label", "⚖️ ইউনিট");
      divs[2]?.setAttribute("data-label", "💰 ক্রয়");
      divs[3]?.setAttribute("data-label", "💵 বিক্রয়");
      divs[4]?.setAttribute("data-label", "📊 স্টক");
      divs[5]?.setAttribute("data-label", "🔢 পরিমাণ");
      divs[6]?.setAttribute("data-label", "");
    }
  });

  document.querySelectorAll(".cart-item").forEach((item) => {
    const divs = item.querySelectorAll("div");
    if (divs.length >= 5) {
      divs[0]?.setAttribute("data-label", "🛒 পণ্য");
      divs[1]?.setAttribute("data-label", "📊 পরিমাণ");
      divs[2]?.setAttribute("data-label", "💵 দর");
      divs[3]?.setAttribute("data-label", "💰 মোট");
      divs[4]?.setAttribute("data-label", "🏷️ ছাড়");
      divs[5]?.setAttribute("data-label", "");
    }
  });
}

// ========== EVENT LISTENERS ==========
productSearch.addEventListener("input", debounce(searchProducts, 500));
categoryFilter.addEventListener("change", searchProducts);
discountInput.addEventListener("input", calculateGrandTotal);
cashReceived.addEventListener("input", calculateChange);
saveSaleBtn.addEventListener("click", saveSale);

// ========== DEBOUNCE ==========
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ========== INITIAL LOAD ==========
loadProducts();

// ========== GLOBAL FUNCTIONS ==========
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateItemDiscount = updateItemDiscount;
window.saveSale = saveSale;
window.searchProducts = searchProducts;
window.setDataLabels = setDataLabels;

console.log("✅ Sales.js loaded with complete offline support");
