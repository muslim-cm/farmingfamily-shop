// ===========================================
// FARMING FAMILY SHOP - CASH MANAGEMENT
// সম্পূর্ণ বাংলায়
// ===========================================

const SUPABASE_URL = "https://vhdjqgwbeezmwllfbljp.supabase.co";
const API_BASE = `${SUPABASE_URL}/functions/v1`;

// Check authentication
const userStr = localStorage.getItem("farming_user") || localStorage.getItem("user");
if (!userStr) window.location.href = "index.html";
const currentUser = JSON.parse(userStr);

// Redirect cashier if needed
if (currentUser.role === "cashier") {
    alert("⚠️ আপনার এই পৃষ্ঠা দেখার অনুমতি নেই!");
    window.location.href = "sales.html";
}

// Format currency
function formatCurrency(amount) {
    return parseFloat(amount || 0).toFixed(2) + " টাকা";
}

// Format date
function formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleDateString("bn-BD") + " " + d.toLocaleTimeString("bn-BD");
}

// Get transaction type in Bengali
function getTransactionTypeBangla(type) {
    const types = {
        'sale': 'বিক্রয়',
        'expense': 'খরচ',
        'purchase': 'ক্রয়',
        'owner_cash_in': 'মালিকের টাকা যোগ',
        'owner_withdrawal': 'মালিকের টাকা উত্তোলন',
        'bank_deposit': 'ব্যাংকে জমা',
        'bank_withdrawal': 'ব্যাংক থেকে তোলা',
        'mobile_deposit': 'মোবাইল ব্যাংকিং জমা',
        'mobile_withdrawal': 'মোবাইল ব্যাংকিং তোলা'
    };
    return types[type] || type;
}

// Get badge class
function getBadgeClass(type) {
    const classes = {
        'sale': 'type-sale',
        'expense': 'type-expense',
        'purchase': 'type-purchase',
        'owner_cash_in': 'type-owner-in',
        'owner_withdrawal': 'type-owner-out',
        'bank_deposit': 'type-bank',
        'bank_withdrawal': 'type-bank',
        'mobile_deposit': 'type-bank',
        'mobile_withdrawal': 'type-bank'
    };
    return classes[type] || '';
}

// Load current balance
async function loadBalance() {
    try {
        const response = await fetch(`${API_BASE}/cash-api/balance`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('currentBalance').textContent = formatCurrency(data.balance);
            document.getElementById('lastUpdated').textContent = 
                `সর্বশেষ আপডেট: ${formatDateTime(data.last_updated)}`;
        }
    } catch (error) {
        console.error("Error loading balance:", error);
    }
}

// Load today's transactions
async function loadTodayTransactions() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/cash-api/transactions?date=${today}`);
        const data = await response.json();
        
        const container = document.getElementById('todayTransactions');
        const countSpan = document.getElementById('todayCount');
        
        if (data.success && data.transactions.length > 0) {
            countSpan.textContent = data.transactions.length + 'টি';
            
            let html = '';
            data.transactions.forEach(t => {
                const amountClass = t.transaction_type.includes('in') || 
                                    t.transaction_type === 'sale' ? 'amount-positive' : 'amount-negative';
                const sign = amountClass === 'amount-positive' ? '+' : '-';
                
                html += `
                    <div class="transaction-item">
                        <div>
                            <span class="type-badge ${getBadgeClass(t.transaction_type)}">
                                ${getTransactionTypeBangla(t.transaction_type)}
                            </span>
                            <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                ${t.description || '-'}
                            </div>
                        </div>
                        <div class="${amountClass}">${sign} ${formatCurrency(t.amount)}</div>
                        <div style="font-size: 12px; color: #666;">${t.payment_method || 'cash'}</div>
                        <div style="font-size: 11px; color: #999;">${formatDateTime(t.created_at)}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            countSpan.textContent = '০টি';
            container.innerHTML = '<p class="text-center" style="color: #666; padding: 20px;">আজকে কোনো লেনদেন নেই</p>';
        }
    } catch (error) {
        console.error("Error loading today transactions:", error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const response = await fetch(`${API_BASE}/cash-api/transactions?limit=20`);
        const data = await response.json();
        
        const container = document.getElementById('recentTransactions');
        const countSpan = document.getElementById('recentCount');
        
        if (data.success && data.transactions.length > 0) {
            countSpan.textContent = data.transactions.length + 'টি';
            
            let html = '';
            data.transactions.forEach(t => {
                const amountClass = t.transaction_type.includes('in') || 
                                    t.transaction_type === 'sale' ? 'amount-positive' : 'amount-negative';
                const sign = amountClass === 'amount-positive' ? '+' : '-';
                
                html += `
                    <div class="transaction-item">
                        <div>
                            <span class="type-badge ${getBadgeClass(t.transaction_type)}">
                                ${getTransactionTypeBangla(t.transaction_type)}
                            </span>
                            <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                ${t.description || '-'}
                            </div>
                        </div>
                        <div class="${amountClass}">${sign} ${formatCurrency(t.amount)}</div>
                        <div style="font-size: 12px; color: #666;">${t.payment_method || 'cash'}</div>
                        <div style="font-size: 11px; color: #999;">${formatDateTime(t.created_at)}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            countSpan.textContent = '০টি';
            container.innerHTML = '<p class="text-center" style="color: #666; padding: 20px;">কোনো লেনদেন নেই</p>';
        }
    } catch (error) {
        console.error("Error loading recent transactions:", error);
    }
}

// Modal functions
let currentModalType = '';

window.openModal = function(type) {
    currentModalType = type;
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('modalTitle');
    const paymentGroup = document.getElementById('paymentMethodGroup');
    
    switch(type) {
        case 'ownerIn':
            title.textContent = 'মালিকের টাকা যোগ';
            paymentGroup.style.display = 'none';
            break;
        case 'ownerOut':
            title.textContent = 'মালিকের টাকা উত্তোলন';
            paymentGroup.style.display = 'none';
            break;
        case 'bankDeposit':
            title.textContent = 'ব্যাংকে জমা';
            paymentGroup.style.display = 'block';
            break;
        case 'bankWithdraw':
            title.textContent = 'ব্যাংক থেকে তোলা';
            paymentGroup.style.display = 'block';
            break;
    }
    
    document.getElementById('transactionType').value = type;
    modal.classList.add('active');
}

window.closeModal = function() {
    document.getElementById('transactionModal').classList.remove('active');
    document.getElementById('transactionForm').reset();
}

// Handle form submit
document.getElementById('transactionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const type = document.getElementById('transactionType').value;
    
    let endpoint = '';
    let transactionType = '';
    
    switch(type) {
        case 'ownerIn':
            endpoint = `${API_BASE}/cash-api/owner-in`;
            transactionType = 'owner_cash_in';
            break;
        case 'ownerOut':
            endpoint = `${API_BASE}/cash-api/owner-out`;
            transactionType = 'owner_withdrawal';
            break;
        case 'bankDeposit':
            endpoint = `${API_BASE}/cash-api/transaction`;
            transactionType = 'bank_deposit';
            break;
        case 'bankWithdraw':
            endpoint = `${API_BASE}/cash-api/transaction`;
            transactionType = 'bank_withdrawal';
            break;
    }
    
    const btn = document.querySelector('.btn-save');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
    btn.disabled = true;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_type: transactionType,
                amount,
                description,
                payment_method: paymentMethod,
                created_by: currentUser.username
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ লেনদেন সফল হয়েছে');
            closeModal();
            loadBalance();
            loadTodayTransactions();
            loadRecentTransactions();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert('❌ ত্রুটি: ' + error.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> সংরক্ষণ করুন';
        btn.disabled = false;
    }
});

// Initial load
loadBalance();
loadTodayTransactions();
loadRecentTransactions();

console.log("✅ Cash.js