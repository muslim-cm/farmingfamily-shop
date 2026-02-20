// ===========================================
// FARMING FAMILY SHOP - REPORTS
// Task 4.6 & 4.7: Report Dashboard + PDF Generation
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

// ========== FORMAT CURRENCY ==========
function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2) + " টাকা";
}

// ========== FORMAT DATE ==========
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// ========== LOAD DAILY REPORT ==========
async function loadDailyReport() {
  const date = new Date().toISOString().split("T")[0];

  try {
    // Fetch daily summary
    const summaryResponse = await fetch(`${API_BASE}/reports-api/daily?date=${date}`);
    const summaryData = await summaryResponse.json();

    if (summaryData.success) {
      const summary = summaryData.summary || {};

      document.getElementById("dailyTotalSales").textContent = formatCurrency(summary.total_sales);
      document.getElementById("dailyTransactions").textContent = summary.total_transactions || 0;
      document.getElementById("dailyTotalExpenses").textContent = formatCurrency(
        summary.total_expenses
      );
      document.getElementById("dailyNetProfit").textContent = formatCurrency(summary.net_profit);

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
    }

    // Fetch low stock alerts
    const lowStockResponse = await fetch(`${API_BASE}/products-api/low-stock`);
    const lowStockData = await lowStockResponse.json();

    const lowStockAlert = document.getElementById("lowStockAlert");
    const lowStockCount = document.getElementById("lowStockCount");

    if (lowStockData.success && lowStockData.count > 0) {
      lowStockAlert.style.display = "flex";
      lowStockCount.textContent = `${lowStockData.count}টি পণ্যের স্টক কম`;
    } else {
      lowStockAlert.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading daily report:", error);
  }
}

// ========== LOAD MONTHLY REPORT ==========
window.loadMonthlyReport = async function () {
  const month = document.getElementById("monthSelector").value;
  const year = document.getElementById("yearSelector").value;

  try {
    const response = await fetch(`${API_BASE}/reports-api/monthly?year=${year}&month=${month}`);
    const data = await response.json();

    if (data.success) {
      const summary = data.summary || {};

      document.getElementById("monthlyTotalSales").textContent = formatCurrency(
        summary.total_sales
      );
      document.getElementById("monthlyTotalExpenses").textContent = formatCurrency(
        summary.total_expenses
      );
      document.getElementById("monthlyNetProfit").textContent = formatCurrency(summary.net_profit);
      document.getElementById("monthlyTransactions").textContent = summary.total_transactions || 0;

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

      // Display top products
      const topProductsList = document.getElementById("topProductsList");

      if (data.top_products && data.top_products.length > 0) {
        let html = "";
        data.top_products.forEach((product, index) => {
          html += `
            <div class="product-item">
              <div>
                <span class="product-name">${index + 1}. ${product.name || "পণ্য"}</span>
                <div class="product-stats">বিক্রি: ${product.quantity || 0} টি</div>
              </div>
              <div style="font-weight: 700; color: #2d3748;">
                ${formatCurrency(product.revenue || 0)}
              </div>
            </div>
          `;
        });
        topProductsList.innerHTML = html;
      } else {
        topProductsList.innerHTML =
          '<p style="color: #718096; text-align: center; padding: 20px;">কোনো বিক্রয় নেই</p>';
      }
    }
  } catch (error) {
    console.error("Error loading monthly report:", error);
  }
};

// ========== LOAD INVENTORY REPORT ==========
async function loadInventoryReport() {
  try {
    const response = await fetch(`${API_BASE}/reports-api/inventory`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("totalProducts").textContent = data.total_products || 0;
      document.getElementById("totalStockValue").textContent =
        (data.total_value || 0).toLocaleString("bn-BD") + " টাকা";
      document.getElementById("lowStockItems").textContent = data.low_stock_count || 0;
      document.getElementById("outOfStockItems").textContent =
        data.low_stock_items?.filter((item) => item.current_quantity <= 0).length || 0;
    }
  } catch (error) {
    console.error("Error loading inventory report:", error);
  }
}

// ========== GENERATE DAILY PDF ==========
window.generateDailyPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Get data
  const date = formatDate(new Date());
  const sales = document.getElementById("dailyTotalSales").textContent;
  const transactions = document.getElementById("dailyTransactions").textContent;
  const expenses = document.getElementById("dailyTotalExpenses").textContent;
  const profit = document.getElementById("dailyNetProfit").textContent;

  // Add Shop Logo/Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Farming Family Shop", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("দৈনিক রিপোর্ট", 105, 32, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Date
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("তারিখ:", 20, 55);
  doc.setFont("helvetica", "normal");
  doc.text(date, 50, 55);

  // Summary Table
  doc.autoTable({
    startY: 70,
    head: [["বিবরণ", "পরিমাণ"]],
    body: [
      ["মোট বিক্রয়", sales],
      ["মোট লেনদেন", transactions + " টি"],
      ["মোট খরচ", expenses],
      ["নিট মুনাফা", profit]
    ],
    theme: "striped",
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: "right" }
    }
  });

  // Low Stock Alert
  const lowStockAlert = document.getElementById("lowStockAlert");
  if (lowStockAlert.style.display !== "none") {
    const lowStockCount = document.getElementById("lowStockCount").textContent;

    doc.setFillColor(255, 243, 224);
    doc.setTextColor(230, 81, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("⚠️ স্টক সতর্কতা", 20, doc.lastAutoTable.finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(lowStockCount, 20, doc.lastAutoTable.finalY + 30);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `রিপোর্ট generated: ${new Date().toLocaleString("bn-BD")}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  // Save PDF
  const fileName = `FarmingFamily_Daily_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);

  // Offer WhatsApp share
  if (confirm("✅ PDF রিপোর্ট তৈরি হয়েছে!\nWhatsApp এ শেয়ার করবেন?")) {
    shareDailyWhatsApp();
  }
};

// ========== GENERATE MONTHLY PDF ==========
window.generateMonthlyPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Get data
  const month = document.getElementById("monthSelector").value;
  const year = document.getElementById("yearSelector").value;
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

  const sales = document.getElementById("monthlyTotalSales").textContent;
  const transactions = document.getElementById("monthlyTransactions").textContent;
  const expenses = document.getElementById("monthlyTotalExpenses").textContent;
  const profit = document.getElementById("monthlyNetProfit").textContent;

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Farming Family Shop", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("মাসিক রিপোর্ট", 105, 32, { align: "center" });

  // Reset
  doc.setTextColor(0, 0, 0);

  // Month/Year
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("মাস:", 20, 55);
  doc.setFont("helvetica", "normal");
  doc.text(`${monthName} ${year}`, 50, 55);

  // Summary Table
  doc.autoTable({
    startY: 70,
    head: [["বিবরণ", "পরিমাণ"]],
    body: [
      ["মোট বিক্রয়", sales],
      ["মোট লেনদেন", transactions + " টি"],
      ["মোট খরচ", expenses],
      ["নিট মুনাফা", profit]
    ],
    theme: "striped",
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: "right" }
    }
  });

  // Top Products
  const topProductsList = document.getElementById("topProductsList");
  if (
    topProductsList.children.length > 0 &&
    !topProductsList.innerHTML.includes("কোনো বিক্রয় নেই")
  ) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("শীর্ষ ৫ পণ্য", 20, doc.lastAutoTable.finalY + 20);

    // Extract product data from HTML
    const products = [];
    const productItems = topProductsList.querySelectorAll(".product-item");
    productItems.forEach((item) => {
      const nameElement = item.querySelector(".product-name");
      const statsElement = item.querySelector(".product-stats");
      const revenueElement = item.querySelector('div[style*="font-weight: 700"]');

      const name = nameElement ? nameElement.textContent : "";
      const stats = statsElement ? statsElement.textContent : "";
      const revenue = revenueElement ? revenueElement.textContent : "";

      if (name && revenue) {
        products.push([name, stats, revenue]);
      }
    });

    if (products.length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 30,
        head: [["পণ্যের নাম", "বিক্রয়", "আয়"]],
        body: products,
        theme: "striped",
        headStyles: {
          fillColor: [0, 176, 155],
          textColor: [255, 255, 255],
          fontStyle: "bold"
        }
      });
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `রিপোর্ট generated: ${new Date().toLocaleString("bn-BD")}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  // Save PDF
  const fileName = `FarmingFamily_Monthly_${year}_${month}.pdf`;
  doc.save(fileName);

  if (confirm("✅ PDF রিপোর্ট তৈরি হয়েছে!\nWhatsApp এ শেয়ার করবেন?")) {
    shareMonthlyWhatsApp();
  }
};

// ========== GENERATE INVENTORY PDF ==========
window.generateInventoryPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Get data
  const totalProducts = document.getElementById("totalProducts").textContent;
  const totalValue = document.getElementById("totalStockValue").textContent;
  const lowStock = document.getElementById("lowStockItems").textContent;
  const outOfStock = document.getElementById("outOfStockItems").textContent;

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Farming Family Shop", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("ইনভেন্টরি রিপোর্ট", 105, 32, { align: "center" });

  // Reset
  doc.setTextColor(0, 0, 0);

  // Date
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("তারিখ:", 20, 55);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(new Date()), 50, 55);

  // Summary Table
  doc.autoTable({
    startY: 70,
    head: [["বিবরণ", "পরিমাণ"]],
    body: [
      ["মোট পণ্য", totalProducts + " টি"],
      ["মোট মূল্য", totalValue],
      ["স্টক কম", lowStock + " টি"],
      ["স্টক শেষ", outOfStock + " টি"]
    ],
    theme: "striped",
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: "right" }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `রিপোর্ট generated: ${new Date().toLocaleString("bn-BD")}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  // Save PDF
  const fileName = `FarmingFamily_Inventory_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);

  if (confirm("✅ PDF রিপোর্ট তৈরি হয়েছে!\nWhatsApp এ শেয়ার করবেন?")) {
    shareInventoryWhatsApp();
  }
};

// ========== SHARE VIA WHATSAPP ==========
window.shareDailyWhatsApp = function () {
  const sales = document.getElementById("dailyTotalSales").textContent;
  const profit = document.getElementById("dailyNetProfit").textContent;

  const text = `🏪 *Farming Family Shop - দৈনিক রিপোর্ট*
📅 *তারিখ:* ${formatDate(new Date())}

💰 *মোট বিক্রয়:* ${sales}
📦 *মোট লেনদেন:* ${document.getElementById("dailyTransactions").textContent}
💸 *মোট খরচ:* ${document.getElementById("dailyTotalExpenses").textContent}
📈 *নিট মুনাফা:* ${profit}

🔗 *রিপোর্ট দেখুন:* ${window.location.origin}/reports.html
🕐 *সময়:* ${new Date().toLocaleString("bn-BD")}`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  window.open(whatsappUrl, "_blank");
};

window.shareMonthlyWhatsApp = function () {
  const month = document.getElementById("monthSelector").value;
  const year = document.getElementById("yearSelector").value;
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

  const sales = document.getElementById("monthlyTotalSales").textContent;
  const profit = document.getElementById("monthlyNetProfit").textContent;

  const text = `🏪 *Farming Family Shop - মাসিক রিপোর্ট*
📅 *মাস:* ${banglaMonths[parseInt(month) - 1]} ${year}

💰 *মোট বিক্রয়:* ${sales}
📦 *মোট লেনদেন:* ${document.getElementById("monthlyTransactions").textContent}
💸 *মোট খরচ:* ${document.getElementById("monthlyTotalExpenses").textContent}
📈 *নিট মুনাফা:* ${profit}

🔗 *রিপোর্ট দেখুন:* ${window.location.origin}/reports.html
🕐 *সময়:* ${new Date().toLocaleString("bn-BD")}`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  window.open(whatsappUrl, "_blank");
};

window.shareInventoryWhatsApp = function () {
  const text = `🏪 *Farming Family Shop - ইনভেন্টরি রিপোর্ট*
📅 *তারিখ:* ${formatDate(new Date())}

📦 *মোট পণ্য:* ${document.getElementById("totalProducts").textContent} টি
💰 *মোট মূল্য:* ${document.getElementById("totalStockValue").textContent}
⚠️ *স্টক কম:* ${document.getElementById("lowStockItems").textContent} টি
❌ *স্টক শেষ:* ${document.getElementById("outOfStockItems").textContent} টি

🔗 *রিপোর্ট দেখুন:* ${window.location.origin}/reports.html
🕐 *সময়:* ${new Date().toLocaleString("bn-BD")}`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  window.open(whatsappUrl, "_blank");
};

// ========== VIEW DETAILED REPORTS ==========
window.viewDailyReport = function () {
  alert("দৈনিক রিপোর্টের বিস্তারিত শীঘ্রই আসছে...");
};

window.viewMonthlyReport = function () {
  alert("মাসিক রিপোর্টের বিস্তারিত শীঘ্রই আসছে...");
};

window.viewInventoryReport = function () {
  alert("ইনভেন্টরি রিপোর্টের বিস্তারিত শীঘ্রই আসছে...");
};

// ========== INITIAL LOAD ==========
document.addEventListener("DOMContentLoaded", function () {
  loadDailyReport();
  loadMonthlyReport();
  loadInventoryReport();
});

// ========== MAKE FUNCTIONS GLOBAL ==========
window.loadDailyReport = loadDailyReport;
window.loadMonthlyReport = loadMonthlyReport;
window.loadInventoryReport = loadInventoryReport;
window.generateDailyPDF = generateDailyPDF;
window.generateMonthlyPDF = generateMonthlyPDF;
window.generateInventoryPDF = generateInventoryPDF;
window.shareDailyWhatsApp = shareDailyWhatsApp;
window.shareMonthlyWhatsApp = shareMonthlyWhatsApp;
window.shareInventoryWhatsApp = shareInventoryWhatsApp;
window.viewDailyReport = viewDailyReport;
window.viewMonthlyReport = viewMonthlyReport;
window.viewInventoryReport = viewInventoryReport;

console.log("✅ Reports.js loaded successfully - PDF Generation Ready!");
