// ===========================================
// FARMING FAMILY SHOP - REPORTS
// UPDATED WITH PRODUCT-WISE TABLES AND PROFIT CALCULATION
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

// ========== UTILITY FUNCTIONS ==========
function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2) + " টাকা";
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatDateShort(date) {
  const d = new Date(date);
  return d.toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "short"
  });
}

// ========== TOGGLE SECTIONS ==========
window.toggleSection = function (sectionId) {
  const section = document.getElementById(sectionId);
  const toggle = section.previousElementSibling;
  if (section.classList.contains("collapsed")) {
    section.classList.remove("collapsed");
    toggle.classList.remove("collapsed");
  } else {
    section.classList.add("collapsed");
    toggle.classList.add("collapsed");
  }
};

// ========== LOAD DAILY REPORT ==========
async function loadDailyReport() {
  const date = new Date().toISOString().split("T")[0];

  try {
    // Fetch all required data in parallel
    const [salesRes, purchasesRes, expensesRes, damagesRes, productsRes, inventoryRes] =
      await Promise.all([
        fetch(`${API_BASE}/sales-api/date?date=${date}`),
        fetch(`${API_BASE}/purchases-api/date?date=${date}`),
        fetch(`${API_BASE}/expenses-api/date?date=${date}`),
        fetch(`${API_BASE}/adjustments-api/date?date=${date}`),
        fetch(`${API_BASE}/products-api/products`),
        fetch(`${API_BASE}/reports-api/inventory`)
      ]);

    const salesData = await salesRes.json();
    const purchasesData = await purchasesRes.json();
    const expensesData = await expensesRes.json();
    const damagesData = await damagesRes.json();
    const productsData = await productsRes.json();
    const inventoryData = await inventoryRes.json();

    // Get previous day's inventory (for start of day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const prevDate = yesterday.toISOString().split("T")[0];

    // For now, use current inventory as end, estimate start
    // In production, you'd track daily opening/closing inventory
    const startInv = inventoryData.total_value || 0;
    const endInv = inventoryData.total_value || 0;

    // Calculate totals
    const totalSales = salesData.total_sales || 0;
    const totalPurchases = purchasesData.total || 0;
    const totalExpenses = expensesData.total || 0;
    const totalDamages = damagesData.total || 0;

    // Calculate profit: (End Inv + Sales) - (Start Inv + Purchases + Damages + Expenses)
    const profit = endInv + totalSales - (startInv + totalPurchases + totalDamages + totalExpenses);

    // Update summary
    document.getElementById("dailyStartInv").textContent = formatCurrency(startInv);
    document.getElementById("dailyPurchases").textContent = formatCurrency(totalPurchases);
    document.getElementById("dailySales").textContent = formatCurrency(totalSales);
    document.getElementById("dailyDamage").textContent = formatCurrency(totalDamages);
    document.getElementById("dailyExpenses").textContent = formatCurrency(totalExpenses);
    document.getElementById("dailyEndInv").textContent = formatCurrency(endInv);
    document.getElementById("dailyProfit").textContent = formatCurrency(profit);
    document.getElementById("dailyProfit").style.color = profit >= 0 ? "#00b09b" : "#ff6b6b";

    // Update date display
    const today = new Date();
    const banglaMonths = [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর"
    ];
    document.getElementById("dailyReportDate").innerHTML =
      `আজকে: ${banglaMonths[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // Display product-wise sales
    displayDailySales(salesData.items || []);

    // Display product-wise purchases
    displayDailyPurchases(purchasesData.items || []);

    // Display expenses
    displayDailyExpenses(expensesData.items || []);

    // Display damages
    displayDailyDamages(damagesData.items || []);
  } catch (error) {
    console.error("Error loading daily report:", error);
  }
}

function displayDailySales(sales) {
  const tbody = document.getElementById("dailySalesBody");
  const countSpan = document.getElementById("dailySalesCount");

  if (!sales || sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো বিক্রয় নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  // Group by product
  const productMap = new Map();
  sales.forEach((sale) => {
    const productId = sale.product_id;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: sale.product_name || sale.products?.name_bengali || "অজানা",
        quantity: 0,
        total: 0,
        profit: 0,
        purchasePrice: sale.purchase_price || 0
      });
    }
    const product = productMap.get(productId);
    product.quantity += sale.quantity || 0;
    product.total += sale.total_price || 0;
    product.profit += (sale.total_price || 0) - (sale.purchase_price || 0) * (sale.quantity || 0);
  });

  let html = "";
  productMap.forEach((product, id) => {
    const avgPrice = product.quantity > 0 ? product.total / product.quantity : 0;
    html += `
      <tr>
        <td>${product.name}</td>
        <td class="text-right">${product.quantity.toFixed(2)}</td>
        <td class="text-right">${avgPrice.toFixed(2)}</td>
        <td class="text-right">${product.total.toFixed(2)}</td>
        <td class="text-right ${product.profit >= 0 ? "profit-positive" : "profit-negative"}">
          ${product.profit.toFixed(2)}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${productMap.size}টি`;
}

function displayDailyPurchases(purchases) {
  const tbody = document.getElementById("dailyPurchasesBody");
  const countSpan = document.getElementById("dailyPurchasesCount");

  if (!purchases || purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো ক্রয় নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  // Group by product
  const productMap = new Map();
  purchases.forEach((purchase) => {
    const productId = purchase.product_id;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: purchase.product_name || purchase.products?.name_bengali || "অজানা",
        quantity: 0,
        total: 0,
        unit: purchase.purchase_unit || "পিস",
        rate: purchase.rate_per_unit || 0
      });
    }
    const product = productMap.get(productId);
    product.quantity += purchase.quantity || 0;
    product.total += purchase.total_cost || 0;
  });

  let html = "";
  productMap.forEach((product, id) => {
    const avgRate = product.quantity > 0 ? product.total / product.quantity : 0;
    html += `
      <tr>
        <td>${product.name}</td>
        <td class="text-right">${product.quantity.toFixed(2)}</td>
        <td>${product.unit}</td>
        <td class="text-right">${avgRate.toFixed(2)}</td>
        <td class="text-right">${product.total.toFixed(2)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${productMap.size}টি`;
}

function displayDailyExpenses(expenses) {
  const tbody = document.getElementById("dailyExpensesBody");
  const countSpan = document.getElementById("dailyExpensesCount");

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">কোনো খরচ নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  let html = "";
  expenses.forEach((expense) => {
    html += `
      <tr>
        <td>${expense.category || "অন্যান্য"}</td>
        <td>${expense.description || "-"}</td>
        <td class="text-right">${formatCurrency(expense.amount || 0)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${expenses.length}টি`;
}

function displayDailyDamages(damages) {
  const tbody = document.getElementById("dailyDamageBody");
  const countSpan = document.getElementById("dailyDamageCount");

  if (!damages || damages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো ক্ষতি/মৃত্যু নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  let html = "";
  damages.forEach((damage) => {
    const loss = (damage.quantity_change || 0) * (damage.purchase_price || 0);
    html += `
      <tr>
        <td>${damage.product_name || "অজানা"}</td>
        <td>${damage.adjustment_type || "ক্ষতি"}</td>
        <td class="text-right">${Math.abs(damage.quantity_change || 0).toFixed(2)}</td>
        <td class="text-right profit-negative">${Math.abs(loss).toFixed(2)}</td>
        <td>${damage.reason_bengali || "-"}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${damages.length}টি`;
}

// ========== LOAD INVENTORY REPORT ==========
async function loadInventoryReport() {
  try {
    const [productsRes, lowStockRes] = await Promise.all([
      fetch(`${API_BASE}/products-api/products`),
      fetch(`${API_BASE}/products-api/low-stock`)
    ]);

    const productsData = await productsRes.json();
    const lowStockData = await lowStockRes.json();

    const products = productsData.data || [];
    const lowStock = lowStockData.data || [];

    // Calculate total inventory value
    let totalValue = 0;
    products.forEach((p) => {
      totalValue += (p.purchase_price || 0) * (p.current_quantity || 0);
    });

    document.getElementById("totalProducts").textContent = products.length;
    document.getElementById("totalStockValue").textContent =
      totalValue.toLocaleString("bn-BD") + " টাকা";
    document.getElementById("lowStockCount").textContent = lowStock.length + "টি";

    // Display low stock items
    displayLowStock(lowStock);

    // Display all products
    displayAllProducts(products);
  } catch (error) {
    console.error("Error loading inventory report:", error);
  }
}

function displayLowStock(items) {
  const tbody = document.getElementById("lowStockBody");

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">কোনো পণ্য কম স্টকে নেই</td></tr>';
    return;
  }

  let html = "";
  items.forEach((item) => {
    const shortage = item.min_stock - item.current_quantity;
    const status = shortage > 5 ? "badge-danger" : "badge-warning";
    const statusText = shortage > 5 ? "জরুরি" : "সতর্ক";

    html += `
      <tr>
        <td>${item.name_bengali}</td>
        <td class="text-right">${item.current_quantity}</td>
        <td class="text-right">${item.min_stock}</td>
        <td><span class="${status}">${statusText}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function displayAllProducts(products) {
  const tbody = document.getElementById("allProductsBody");
  const countSpan = document.getElementById("allProductsCount");

  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">কোনো পণ্য নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  let html = "";
  products.forEach((product) => {
    const unitDisplay =
      product.unit_type === "piece" ? "পিস" : product.unit_type === "weight" ? "কেজি" : "পিস/কেজি";

    html += `
      <tr>
        <td>${product.name_bengali}</td>
        <td>${product.category}</td>
        <td class="text-right">${product.current_quantity}</td>
        <td>${unitDisplay}</td>
        <td class="text-right">${product.purchase_price || 0}</td>
        <td class="text-right">${product.selling_price || 0}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = products.length + "টি";
}

// ========== LOAD MONTHLY REPORT ==========
window.loadMonthlyReport = async function () {
  const month = document.getElementById("monthSelector").value;
  const year = document.getElementById("yearSelector").value;

  const startDate = `${year}-${month.padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  try {
    // Fetch all monthly data
    const [salesRes, purchasesRes, expensesRes, damagesRes, inventoryRes] = await Promise.all([
      fetch(`${API_BASE}/sales-api/range?start=${startDate}&end=${endDate}`),
      fetch(`${API_BASE}/purchases-api/range?start=${startDate}&end=${endDate}`),
      fetch(`${API_BASE}/expenses-api/range?start=${startDate}&end=${endDate}`),
      fetch(`${API_BASE}/adjustments-api/range?start=${startDate}&end=${endDate}`),
      fetch(`${API_BASE}/reports-api/inventory`)
    ]);

    const salesData = await salesRes.json();
    const purchasesData = await purchasesRes.json();
    const expensesData = await expensesRes.json();
    const damagesData = await damagesRes.json();
    const inventoryData = await inventoryRes.json();

    // Get start of month inventory (previous month's end)
    // For now, use current inventory as end, estimate start
    const startInv = inventoryData.total_value || 0;
    const endInv = inventoryData.total_value || 0;

    // Calculate totals
    const totalSales = salesData.total || 0;
    const totalPurchases = purchasesData.total || 0;
    const totalExpenses = expensesData.total || 0;
    const totalDamages = damagesData.total || 0;

    // Calculate profit
    const profit = endInv + totalSales - (startInv + totalPurchases + totalDamages + totalExpenses);

    // Update month display
    const banglaMonths = [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর"
    ];
    document.getElementById("monthlyReportDate").innerHTML =
      `${banglaMonths[parseInt(month) - 1]} ${year}`;

    // Update summary
    document.getElementById("monthlyStartInv").textContent = formatCurrency(startInv);
    document.getElementById("monthlyPurchases").textContent = formatCurrency(totalPurchases);
    document.getElementById("monthlySales").textContent = formatCurrency(totalSales);
    document.getElementById("monthlyDamage").textContent = formatCurrency(totalDamages);
    document.getElementById("monthlyExpenses").textContent = formatCurrency(totalExpenses);
    document.getElementById("monthlyEndInv").textContent = formatCurrency(endInv);
    document.getElementById("monthlyProfit").textContent = formatCurrency(profit);
    document.getElementById("monthlyProfit").style.color = profit >= 0 ? "#00b09b" : "#ff6b6b";

    // Display monthly sales
    displayMonthlySales(salesData.items || []);

    // Display monthly purchases
    displayMonthlyPurchases(purchasesData.items || []);

    // Display monthly expenses
    displayMonthlyExpenses(expensesData.items || []);

    // Display monthly damages
    displayMonthlyDamages(damagesData.items || []);
  } catch (error) {
    console.error("Error loading monthly report:", error);
  }
};

function displayMonthlySales(sales) {
  const tbody = document.getElementById("monthlySalesBody");
  const countSpan = document.getElementById("monthlySalesCount");

  if (!sales || sales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো বিক্রয় নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  // Group by product
  const productMap = new Map();
  sales.forEach((sale) => {
    const productId = sale.product_id;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: sale.product_name || sale.products?.name_bengali || "অজানা",
        quantity: 0,
        total: 0,
        profit: 0
      });
    }
    const product = productMap.get(productId);
    product.quantity += sale.quantity || 0;
    product.total += sale.total_price || 0;
  });

  let html = "";
  productMap.forEach((product, id) => {
    const avgPrice = product.quantity > 0 ? product.total / product.quantity : 0;
    // Estimate profit (simplified)
    const estimatedProfit = product.total * 0.2; // 20% assumed profit

    html += `
      <tr>
        <td>${product.name}</td>
        <td class="text-right">${product.quantity.toFixed(2)}</td>
        <td class="text-right">${avgPrice.toFixed(2)}</td>
        <td class="text-right">${product.total.toFixed(2)}</td>
        <td class="text-right profit-positive">${estimatedProfit.toFixed(2)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${productMap.size}টি`;
}

function displayMonthlyPurchases(purchases) {
  const tbody = document.getElementById("monthlyPurchasesBody");
  const countSpan = document.getElementById("monthlyPurchasesCount");

  if (!purchases || purchases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো ক্রয় নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  // Group by product
  const productMap = new Map();
  purchases.forEach((purchase) => {
    const productId = purchase.product_id;
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: purchase.product_name || purchase.products?.name_bengali || "অজানা",
        quantity: 0,
        total: 0,
        unit: purchase.purchase_unit || "পিস"
      });
    }
    const product = productMap.get(productId);
    product.quantity += purchase.quantity || 0;
    product.total += purchase.total_cost || 0;
  });

  let html = "";
  productMap.forEach((product, id) => {
    const avgRate = product.quantity > 0 ? product.total / product.quantity : 0;
    html += `
      <tr>
        <td>${product.name}</td>
        <td class="text-right">${product.quantity.toFixed(2)}</td>
        <td>${product.unit}</td>
        <td class="text-right">${avgRate.toFixed(2)}</td>
        <td class="text-right">${product.total.toFixed(2)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${productMap.size}টি`;
}

function displayMonthlyExpenses(expenses) {
  const tbody = document.getElementById("monthlyExpensesBody");
  const countSpan = document.getElementById("monthlyExpensesCount");

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">কোনো খরচ নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  let html = "";
  expenses.forEach((expense) => {
    html += `
      <tr>
        <td>${expense.category || "অন্যান্য"}</td>
        <td>${expense.description || "-"}</td>
        <td class="text-right">${formatCurrency(expense.amount || 0)}</td>
        <td>${formatDateShort(expense.created_at)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${expenses.length}টি`;
}

function displayMonthlyDamages(damages) {
  const tbody = document.getElementById("monthlyDamageBody");
  const countSpan = document.getElementById("monthlyDamageCount");

  if (!damages || damages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">কোনো ক্ষতি/মৃত্যু নেই</td></tr>';
    countSpan.textContent = "০টি";
    return;
  }

  let html = "";
  damages.forEach((damage) => {
    const loss = (damage.quantity_change || 0) * (damage.purchase_price || 0);
    html += `
      <tr>
        <td>${damage.product_name || "অজানা"}</td>
        <td>${damage.adjustment_type || "ক্ষতি"}</td>
        <td class="text-right">${Math.abs(damage.quantity_change || 0).toFixed(2)}</td>
        <td class="text-right profit-negative">${Math.abs(loss).toFixed(2)}</td>
        <td>${damage.reason_bengali || "-"}</td>
        <td>${formatDateShort(damage.created_at)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countSpan.textContent = `${damages.length}টি`;
}

// ========== PDF GENERATION ==========
window.generateDailyPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Farming Family Shop", 105, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text("দৈনিক রিপোর্ট", 105, 25, { align: "center" });

  // Date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`তারিখ: ${document.getElementById("dailyReportDate").textContent}`, 20, 40);

  // Profit Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("লাভ/ক্ষতি হিসাব", 20, 55);

  const summaryData = [
    ["শুরুর ইনভেন্টরি", document.getElementById("dailyStartInv").textContent],
    ["মোট ক্রয়", document.getElementById("dailyPurchases").textContent],
    ["মোট বিক্রয়", document.getElementById("dailySales").textContent],
    ["মোট ক্ষতি/মৃত্যু", document.getElementById("dailyDamage").textContent],
    ["অন্যান্য খরচ", document.getElementById("dailyExpenses").textContent],
    ["শেষ ইনভেন্টরি", document.getElementById("dailyEndInv").textContent],
    ["নিট লাভ/ক্ষতি", document.getElementById("dailyProfit").textContent]
  ];

  doc.autoTable({
    startY: 60,
    body: summaryData,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60, halign: "right" } }
  });

  // Sales Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("বিক্রয় তালিকা", 20, doc.lastAutoTable.finalY + 15);

  const salesTable = document.getElementById("dailySalesTable");
  if (salesTable) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      html: "#dailySalesTable",
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [102, 126, 234] }
    });
  }

  // Purchases Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ক্রয় তালিকা", 20, doc.lastAutoTable.finalY + 15);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    html: "#dailyPurchasesTable",
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 176, 155] }
  });

  // Save PDF
  doc.save(`Daily_Report_${new Date().toISOString().split("T")[0]}.pdf`);
};

window.shareDailyWhatsApp = function () {
  // Generate PDF and share via WhatsApp
  generateDailyPDF();
  // After PDF is generated, you can share it
  // For now, we'll share a text summary
  const text = `🏪 Farming Family Shop - দৈনিক রিপোর্ট
📅 ${document.getElementById("dailyReportDate").textContent}

💰 লাভ/ক্ষতি:
   শুরু: ${document.getElementById("dailyStartInv").textContent}
   ক্রয়: ${document.getElementById("dailyPurchases").textContent}
   বিক্রয়: ${document.getElementById("dailySales").textContent}
   ক্ষতি: ${document.getElementById("dailyDamage").textContent}
   খরচ: ${document.getElementById("dailyExpenses").textContent}
   শেষ: ${document.getElementById("dailyEndInv").textContent}
   ----------------------------------------
   ✅ নিট লাভ: ${document.getElementById("dailyProfit").textContent}

📊 বিক্রয়: ${document.getElementById("dailySalesCount").textContent}
📦 ক্রয়: ${document.getElementById("dailyPurchases").textContent}

🔗 বিস্তারিত: ${window.location.origin}/reports.html`;

  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, "_blank");
};

// ========== INITIAL LOAD ==========
document.addEventListener("DOMContentLoaded", function () {
  loadDailyReport();
  loadInventoryReport();
  loadMonthlyReport();
});

// ========== MAKE FUNCTIONS GLOBAL ==========
window.loadDailyReport = loadDailyReport;
window.loadMonthlyReport = loadMonthlyReport;
window.loadInventoryReport = loadInventoryReport;
window.generateDailyPDF = generateDailyPDF;
window.shareDailyWhatsApp = shareDailyWhatsApp;

// ========== GENERATE INVENTORY PDF ==========
window.generateInventoryPDF = function () {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Farming Family Shop", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("ইনভেন্টরি রিপোর্ট", 105, 25, { align: "center" });

    // Date
    doc.setTextColor(0, 0, 0);
    const today = new Date();
    const dateStr = today.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    doc.text(`তারিখ: ${dateStr}`, 20, 40);

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("সারসংক্ষেপ", 20, 55);

    const totalProducts = document.getElementById("totalProducts")?.textContent || "০";
    const totalValue = document.getElementById("totalStockValue")?.textContent || "০";

    doc.autoTable({
      startY: 60,
      body: [
        ["মোট পণ্য", totalProducts + " টি"],
        ["মোট মূল্য", totalValue]
      ],
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60, halign: "right" } }
    });

    // Low Stock Table
    const lowStockTable = document.getElementById("lowStockTable");
    if (lowStockTable && lowStockTable.querySelector("tbody").children.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("কম স্টক পণ্য", 20, doc.lastAutoTable.finalY + 15);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        html: "#lowStockTable",
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 160, 0] }
      });
    }

    // All Products Table
    const allProductsTable = document.getElementById("allProductsTable");
    if (allProductsTable && allProductsTable.querySelector("tbody").children.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("সমস্ত পণ্যের তালিকা", 20, doc.lastAutoTable.finalY + 15);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        html: "#allProductsTable",
        theme: "striped",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [102, 126, 234] }
      });
    }

    // Save PDF
    const fileName = `Inventory_Report_${today.toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    console.log("✅ Inventory PDF generated");
  } catch (error) {
    console.error("Inventory PDF error:", error);
    alert("PDF জেনারেট করতে সমস্যা হয়েছে: " + error.message);
  }
};

// ========== GENERATE MONTHLY PDF ==========
window.generateMonthlyPDF = function () {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Farming Family Shop", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("মাসিক রিপোর্ট", 105, 25, { align: "center" });

    // Month/Year
    doc.setTextColor(0, 0, 0);
    const month = document.getElementById("monthSelector")?.value || "2";
    const year = document.getElementById("yearSelector")?.value || "2026";
    const banglaMonths = [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর"
    ];
    const monthName = banglaMonths[parseInt(month) - 1];
    doc.text(`মাস: ${monthName} ${year}`, 20, 40);

    // Profit Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("লাভ/ক্ষতি হিসাব", 20, 55);

    const summaryData = [
      ["শুরুর ইনভেন্টরি", document.getElementById("monthlyStartInv")?.textContent || "০.০০"],
      ["মোট ক্রয়", document.getElementById("monthlyPurchases")?.textContent || "০.০০"],
      ["মোট বিক্রয়", document.getElementById("monthlySales")?.textContent || "০.০০"],
      ["মোট ক্ষতি/মৃত্যু", document.getElementById("monthlyDamage")?.textContent || "০.০০"],
      ["অন্যান্য খরচ", document.getElementById("monthlyExpenses")?.textContent || "০.০০"],
      ["শেষ ইনভেন্টরি", document.getElementById("monthlyEndInv")?.textContent || "০.০০"],
      ["নিট লাভ/ক্ষতি", document.getElementById("monthlyProfit")?.textContent || "০.০০"]
    ];

    doc.autoTable({
      startY: 60,
      body: summaryData,
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60, halign: "right" } }
    });

    // Monthly Sales Table
    const salesTable = document.getElementById("monthlySalesTable");
    if (salesTable && salesTable.querySelector("tbody").children.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("মাসিক বিক্রয়", 20, doc.lastAutoTable.finalY + 15);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        html: "#monthlySalesTable",
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 176, 155] }
      });
    }

    // Save PDF
    const fileName = `Monthly_Report_${year}_${month}.pdf`;
    doc.save(fileName);
    console.log("✅ Monthly PDF generated");
  } catch (error) {
    console.error("Monthly PDF error:", error);
    alert("PDF জেনারেট করতে সমস্যা হয়েছে: " + error.message);
  }
};

// ========== SHARE INVENTORY VIA WHATSAPP ==========
window.shareInventoryWhatsApp = function () {
  generateInventoryPDF();
  const text = `🏪 Farming Family Shop - ইনভেন্টরি রিপোর্ট
📅 ${new Date().toLocaleDateString("bn-BD")}

📦 মোট পণ্য: ${document.getElementById("totalProducts")?.textContent || "০"}
💰 মোট মূল্য: ${document.getElementById("totalStockValue")?.textContent || "০"}
⚠️ কম স্টক: ${document.getElementById("lowStockCount")?.textContent || "০"}

🔗 ${window.location.origin}`;

  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, "_blank");
};

// ========== SHARE MONTHLY VIA WHATSAPP ==========
window.shareMonthlyWhatsApp = function () {
  generateMonthlyPDF();
  const month = document.getElementById("monthSelector")?.value || "2";
  const year = document.getElementById("yearSelector")?.value || "2026";
  const banglaMonths = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্টেম্বর",
    "অক্টোবর",
    "নভেম্বর",
    "ডিসেম্বর"
  ];

  const text = `🏪 Farming Family Shop - মাসিক রিপোর্ট
📅 ${banglaMonths[parseInt(month) - 1]} ${year}

💰 বিক্রয়: ${document.getElementById("monthlySales")?.textContent || "০"}
💸 খরচ: ${document.getElementById("monthlyExpenses")?.textContent || "০"}
📈 লাভ: ${document.getElementById("monthlyProfit")?.textContent || "০"}

🔗 ${window.location.origin}`;

  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, "_blank");
};

// ========== MAKE ALL FUNCTIONS GLOBAL ==========
window.generateInventoryPDF = generateInventoryPDF;
window.generateMonthlyPDF = generateMonthlyPDF;
window.shareInventoryWhatsApp = shareInventoryWhatsApp;
window.shareMonthlyWhatsApp = shareMonthlyWhatsApp;

console.log("✅ Reports.js loaded with product-wise reports");
