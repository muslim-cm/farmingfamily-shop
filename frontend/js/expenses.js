// ===========================================
// FARMING FAMILY SHOP - EXPENSE ENTRY
// Task 4.5: Expense Entry Form
// ===========================================

const SUPABASE_URL = "https://vhdjqgwbeezmwllfbljp.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1`;

// Check authentication and permissions
const userStr = localStorage.getItem("farming_user") || localStorage.getItem("user");
if (!userStr) {
  window.location.href = "index.html";
}
const currentUser = JSON.parse(userStr);

// Redirect cashier
if (currentUser.role === "cashier") {
  window.location.href = "sales.html";
}

// Store products for dropdowns
let products = [];

// ========== LOAD PRODUCTS FOR DROPDOWNS ==========
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products-api/products`);
    const data = await response.json();

    if (data.success) {
      products = data.data;
      populateProductDropdowns();
    }
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

// ========== POPULATE PRODUCT DROPDOWNS ==========
function populateProductDropdowns() {
  const purchaseSelect = document.getElementById("purchaseProductId");
  const damageSelect = document.getElementById("damageProductId");

  let options = '<option value="">-- পণ্য নির্বাচন করুন --</option>';

  products.forEach((product) => {
    options += `<option value="${product.id}" data-category="${product.category}" data-unit="${product.unit_type}" data-price="${product.purchase_price || 0}" data-stock="${product.current_quantity}" data-weight="${product.current_weight || 0}">${product.name_bengali} (${product.category})</option>`;
  });

  purchaseSelect.innerHTML = options;
  damageSelect.innerHTML = options;
}

// ========== LOAD PURCHASE PRODUCT INFO ==========
window.loadPurchaseProductInfo = function () {
  const select = document.getElementById("purchaseProductId");
  const selected = select.selectedOptions[0];
  const stockInfo = document.getElementById("purchaseStockInfo");

  if (!selected || !selected.value) {
    stockInfo.style.display = "none";
    return;
  }

  const category = selected.dataset.category;
  const currentStock = parseFloat(selected.dataset.stock) || 0;
  const currentWeight = parseFloat(selected.dataset.weight) || 0;
  const unitType = selected.dataset.unit;

  let stockText = `বর্তমান স্টক: ${currentStock.toFixed(2)} পিস`;
  if (category === "পাখি ও বাচ্চা") {
    stockText += `, ওজন: ${currentWeight.toFixed(2)} কেজি`;
  }

  stockInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${stockText}`;
  stockInfo.style.display = "block";

  // Set default unit based on product type
  const unitSelect = document.getElementById("purchaseUnit");
  if (unitType === "weight") {
    unitSelect.value = "kg";
  } else {
    unitSelect.value = "pc";
  }

  calculatePurchaseTotal();
};

// ========== CALCULATE PURCHASE TOTAL ==========
function calculatePurchaseTotal() {
  const quantity = parseFloat(document.getElementById("purchaseQuantity").value) || 0;
  const rate = parseFloat(document.getElementById("purchaseRate").value) || 0;
  const discount = parseFloat(document.getElementById("purchaseDiscount").value) || 0;

  const total = quantity * rate - discount;
  document.getElementById("purchaseTotal").textContent = total.toFixed(2);
}

// ========== SAVE PURCHASE ==========
window.savePurchase = async function () {
  const productId = document.getElementById("purchaseProductId").value;
  if (!productId) {
    alert("⚠️ পণ্য নির্বাচন করুন");
    return;
  }

  const quantity = parseFloat(document.getElementById("purchaseQuantity").value) || 0;
  if (quantity <= 0) {
    alert("⚠️ পরিমাণ ০ এর বেশি হতে হবে");
    return;
  }

  const rate = parseFloat(document.getElementById("purchaseRate").value) || 0;
  if (rate <= 0) {
    alert("⚠️ ক্রয় মূল্য ০ এর বেশি হতে হবে");
    return;
  }

  const unit = document.getElementById("purchaseUnit").value;
  const discount = parseFloat(document.getElementById("purchaseDiscount").value) || 0;
  const supplier = document.getElementById("purchaseSupplier").value || null;
  const notes = document.getElementById("purchaseNotes").value || null;

  // Calculate conversion to base unit
  let quantityInBase = quantity;
  let weightAdded = 0;

  // Unit conversions
  if (unit === "cage") quantityInBase = quantity * 30;
  else if (unit === "হালি") quantityInBase = quantity * 4;
  else if (unit === "ডজন") quantityInBase = quantity * 12;
  else if (unit === "kg") {
    quantityInBase = quantity; // For weight products
    weightAdded = quantity;
  }

  const product = products.find((p) => p.id === productId);

  const purchaseData = {
    product_id: productId,
    purchase_unit: unit,
    quantity: quantity,
    rate_per_unit: rate,
    discount: discount,
    supplier_name: supplier,
    notes: notes,
    quantity_added_to_stock: quantityInBase,
    weight_added: weightAdded,
    new_avg_weight:
      product?.category === "পাখি ও বাচ্চা" && weightAdded > 0
        ? (product.current_weight + weightAdded) / (product.current_quantity + quantityInBase)
        : null,
    created_by: currentUser.username
  };

  const btn = document.getElementById("savePurchaseBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/purchases-api/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchaseData)
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ ক্রয় সফলভাবে সংরক্ষণ করা হয়েছে");

      // Reset form
      document.getElementById("purchaseProductId").value = "";
      document.getElementById("purchaseQuantity").value = "";
      document.getElementById("purchaseRate").value = "";
      document.getElementById("purchaseDiscount").value = "0";
      document.getElementById("purchaseSupplier").value = "";
      document.getElementById("purchaseNotes").value = "";
      document.getElementById("purchaseTotal").textContent = "0.00";
      document.getElementById("purchaseStockInfo").style.display = "none";

      // Reload products
      await loadProducts();
      loadRecentExpenses();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error("Error saving purchase:", error);
    alert("❌ ক্রয় সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

// ========== LOAD DAMAGE PRODUCT INFO ==========
window.loadDamageProductInfo = function () {
  const select = document.getElementById("damageProductId");
  const selected = select.selectedOptions[0];
  const stockInfo = document.getElementById("damageStockInfo");

  if (!selected || !selected.value) {
    stockInfo.style.display = "none";
    return;
  }

  const currentStock = parseFloat(selected.dataset.stock) || 0;
  const currentWeight = parseFloat(selected.dataset.weight) || 0;
  const category = selected.dataset.category;

  let stockText = `বর্তমান স্টক: ${currentStock.toFixed(2)} পিস`;
  if (category === "পাখি ও বাচ্চা") {
    stockText += `, ওজন: ${currentWeight.toFixed(2)} কেজি`;
  }

  stockInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${stockText}`;
  stockInfo.style.display = "block";
};

// ========== SAVE DAMAGE/DEATH ==========
window.saveDamage = async function () {
  const productId = document.getElementById("damageProductId").value;
  if (!productId) {
    alert("⚠️ পণ্য নির্বাচন করুন");
    return;
  }

  const damageType = document.getElementById("damageType").value;
  const reason = document.getElementById("damageReason").value;
  const unit = document.getElementById("damageUnit").value;
  const quantity = parseFloat(document.getElementById("damageQuantity").value) || 0;
  const weight = parseFloat(document.getElementById("damageWeight").value) || 0;
  const notes = document.getElementById("damageNotes").value || null;

  if (quantity <= 0 && weight <= 0) {
    alert("⚠️ কমপক্ষে একটি পরিবর্তন দিন (পরিমাণ বা ওজন)");
    return;
  }

  // Determine reason in Bengali
  let reasonBengali = "";
  switch (reason) {
    case "spoiled":
      reasonBengali = "পচে গেছে";
      break;
    case "broken":
      reasonBengali = "ভেঙে গেছে";
      break;
    case "disease":
      reasonBengali = "রোগ";
      break;
    case "accident":
      reasonBengali = "দুর্ঘটনা";
      break;
    default:
      reasonBengali = "অন্যান্য";
  }

  // Determine adjustment type
  let adjustmentType = damageType;
  if (damageType === "weight_loss") adjustmentType = "weight_change";
  if (damageType === "weight_gain") adjustmentType = "weight_change";

  // For weight gain, make weight positive
  let weightChange = weight;
  if (damageType === "weight_loss") weightChange = -weight;
  if (damageType === "weight_gain") weightChange = weight;

  const damageData = {
    product_id: productId,
    adjustment_type: adjustmentType,
    reason_bengali: reasonBengali,
    reason_english: reason,
    unit: unit,
    quantity_change: damageType === "death" || damageType === "damage" ? -quantity : 0,
    weight_change: weightChange,
    notes: notes,
    adjusted_by: currentUser.username
  };

  const btn = document.getElementById("saveDamageBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/adjustments-api/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(damageData)
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ সংরক্ষণ করা হয়েছে");

      // Reset form
      document.getElementById("damageProductId").value = "";
      document.getElementById("damageQuantity").value = "";
      document.getElementById("damageWeight").value = "";
      document.getElementById("damageNotes").value = "";
      document.getElementById("damageStockInfo").style.display = "none";

      // Reload products
      await loadProducts();
      loadRecentExpenses();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error("Error saving damage:", error);
    alert("❌ সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

// ========== SAVE SHOP EXPENSE ==========
window.saveExpense = async function () {
  const category = document.getElementById("expenseCategory").value;
  const amount = parseFloat(document.getElementById("expenseAmount").value) || 0;
  const description = document.getElementById("expenseDescription").value || null;

  if (amount <= 0) {
    alert("⚠️ পরিমাণ ০ এর বেশি হতে হবে");
    return;
  }

  const expenseData = {
    category: category,
    amount: amount,
    description: description,
    entered_by: currentUser.username
  };

  const btn = document.getElementById("saveExpenseBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/expenses-api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData)
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ খরচ সংরক্ষণ করা হয়েছে");

      // Reset form
      document.getElementById("expenseAmount").value = "";
      document.getElementById("expenseDescription").value = "";

      loadRecentExpenses();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error("Error saving expense:", error);
    alert("❌ খরচ সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

// ========== LOAD RECENT EXPENSES ==========
async function loadRecentExpenses() {
  const listEl = document.getElementById("recentExpensesList");

  try {
    const response = await fetch(`${API_BASE}/expenses-api/expenses?recent=10`);
    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      let html = '<div class="recent-item recent-header">';
      html += "<span>বিবরণ</span>";
      html += "<span>ধরন</span>";
      html += "<span>পরিমাণ</span>";
      html += "<span>সময়</span>";
      html += "</div>";

      data.data.forEach((expense) => {
        let badgeClass = "badge-expense";
        if (expense.category === "পণ্য কেনা") badgeClass = "badge-purchase";

        html += '<div class="recent-item">';
        html += `<span>${expense.description || expense.category}</span>`;
        html += `<span><span class="${badgeClass}">${expense.category}</span></span>`;
        html += `<span style="font-weight: 600; color: #00b09b;">${expense.amount.toFixed(2)} টাকা</span>`;
        html += `<span style="color: #666; font-size: 13px;">${new Date(expense.created_at).toLocaleString("bn-BD")}</span>`;
        html += "</div>";
      });

      listEl.innerHTML = html;
    } else {
      listEl.innerHTML =
        '<div style="text-align: center; color: #666; padding: 30px;"><i class="fas fa-receipt"></i><p>কোনো লেনদেন পাওয়া যায়নি</p></div>';
    }
  } catch (error) {
    console.error("Error loading expenses:", error);
    listEl.innerHTML =
      '<div style="text-align: center; color: #ff6b6b; padding: 30px;"><i class="fas fa-exclamation-triangle"></i><p>লোড করতে সমস্যা হয়েছে</p></div>';
  }
}

// ========== EVENT LISTENERS ==========
document.getElementById("purchaseQuantity").addEventListener("input", calculatePurchaseTotal);
document.getElementById("purchaseRate").addEventListener("input", calculatePurchaseTotal);
document.getElementById("purchaseDiscount").addEventListener("input", calculatePurchaseTotal);

// ========== INITIAL LOAD ==========
loadProducts();
loadRecentExpenses();

// ========== MAKE FUNCTIONS GLOBAL ==========
window.loadPurchaseProductInfo = loadPurchaseProductInfo;
window.loadDamageProductInfo = loadDamageProductInfo;
window.savePurchase = savePurchase;
window.saveDamage = saveDamage;
window.saveExpense = saveExpense;
window.calculatePurchaseTotal = calculatePurchaseTotal;

console.log("✅ Expenses.js loaded successfully");
