const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#1a1f2e');
tg.setBackgroundColor('#0f1419');

const translations = {
    ru: {
        starsTitle: 'Telegram Stars',
        recipientLabel: 'Получатель',
        usernamePlaceholder: 'Username',
        selfBtn: 'Себе',
        amountLabel: 'Количество звёзд',
        customLabel: 'Или своя сумма',
        customPlaceholder: '150',
        customBtn: 'OK',
        buyBtn: 'Купить',
        giftTitle: 'Подарки',
        ratingTitle: 'Топ',
        profileTitle: 'Профиль',
        totalSpent: 'Всего',
        totalPurchases: 'Покупок',
        historyTitle: 'История',
        noHistory: 'Пусто',
        insufficientBalance: 'Недостаточно средств',
        topupTitle: 'Пополнение',
        topupAmount: 'Сумма',
        topupProof: 'Чек',
        topupSubmit: 'Отправить',
        topupSuccess: 'Заявка отправлена',
        cancel: 'Отмена',
        sent: 'Отправил',
        lang: 'RU',
        menu: 'Меню',
        gift: 'Подарки',
        rating: 'Рейтинг',
        profile: 'Профиль',
        stars: 'Stars',
        jami: 'Всего',
        xaridlar: 'Покупок',
        tarix: 'История'
    },
    uz: {
        starsTitle: 'Telegram Stars',
        recipientLabel: 'Qabul qiluvchi',
        usernamePlaceholder: 'Username',
        selfBtn: "O'zim",
        amountLabel: 'Stars miqdori',
        customLabel: "Yoki o'z miqdoringiz",
        customPlaceholder: '150',
        customBtn: 'OK',
        buyBtn: 'Sotib olish',
        giftTitle: "Sovg'alar",
        ratingTitle: 'Top',
        profileTitle: 'Profil',
        totalSpent: 'Jami',
        totalPurchases: 'Xaridlar',
        historyTitle: 'Tarix',
        noHistory: "Bo'sh",
        insufficientBalance: "Mablag' yetarli emas",
        topupTitle: "Balansni to'ldirish",
        topupAmount: 'Summa',
        topupProof: 'Chek',
        topupSubmit: "Yuborish",
        topupSuccess: "Zayavka yuborildi",
        cancel: 'Bekor qilish',
        sent: "Yubordim",
        lang: 'UZ',
        menu: 'Menyu',
        gift: 'Gift',
        rating: 'Reyting',
        profile: 'Profil',
        stars: 'Stars',
        jami: 'Jami',
        xaridlar: 'Xaridlar',
        tarix: 'Tarix'
    }
};

const starPrices = {
    50: 10000,
    75: 14000,
    100: 18000,
    250: 42000,
    500: 80000
};

const gifts = [
    { id: 1, emoji: '🌹', name: { ru: 'Роза', uz: 'Atirgul' }, stars: 15, price: 3000 },
    { id: 2, emoji: '🔥', name: { ru: 'Огонь', uz: 'Olov' }, stars: 20, price: 4000 },
    { id: 3, emoji: '💎', name: { ru: 'Бриллиант', uz: 'Olmos' }, stars: 30, price: 6000 },
    { id: 4, emoji: '👑', name: { ru: 'Корона', uz: 'Toj' }, stars: 50, price: 10000 },
    { id: 5, emoji: '🚀', name: { ru: 'Ракета', uz: 'Raketa' }, stars: 75, price: 15000 },
    { id: 6, emoji: '🏆', name: { ru: 'Трофей', uz: 'Kubok' }, stars: 100, price: 20000 }
];

let currentLang = 'uz';
let selectedStars = 50;
let userBalance = 0;
let userData = { history: [], totalSpent: 0, totalPurchases: 0 };
let paymentDetails = 'Karta: 8600 1234 5678 9012\nTelefon: +998 90 123 45 67';

// ============================================
// 🌐 ГЛОБАЛЬНЫЕ ФУНКЦИИ (для onclick)
// ============================================

window.selectLanguage = function(lang) {
    console.log('🌐 Выбор языка:', lang);
    currentLang = lang;
    localStorage.setItem('language', lang);
    const modal = document.getElementById('languageModal');
    if (modal) {
        modal.style.display = 'none';
    }
    initApp();
};

window.toggleLanguage = function() {
    currentLang = currentLang === 'uz' ? 'ru' : 'uz';
    localStorage.setItem('language', currentLang);
    const btn = document.getElementById('currentLangText');
    if (btn) btn.textContent = translations[currentLang].lang;
    initApp();
};

window.refreshBalance = function() {
    console.log('🔄 Обновление...');
    loadUserBalance();
    const btn = document.querySelector('.refresh-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        setTimeout(function() { btn.style.transform = 'rotate(0deg)'; }, 500);
    }
};

window.closeApp = function() {
    tg.close();
};

window.openSupport = function() {
    tg.openTelegramLink('https://t.me/stars_support_manager');
};

window.setSelf = function() {
    const user = tg.initDataUnsafe.user;
    if (user) {
        document.getElementById('username').value = user.username || user.first_name;
    }
};

window.selectStars = function(amount) {
    selectedStars = amount;
    document.getElementById('starsAmount').value = amount;
    updatePriceDisplay();
    document.querySelectorAll('.quick-btn').forEach(function(btn) {
        btn.classList.toggle('active', parseInt(btn.textContent) === amount);
    });
    tg.MainButton.show();
};

window.setCustomStars = function() {
    const custom = parseInt(document.getElementById('customStars').value);
    if (custom && custom > 0) {
        selectedStars = custom;
        document.getElementById('starsAmount').value = custom;
        const price = custom * 200;
        document.getElementById('priceDisplay').textContent = price.toLocaleString() + " so'm";
        document.querySelectorAll('.quick-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });
        tg.MainButton.show();
    }
};

window.navTo = function(page) {
    document.querySelectorAll('.nav-item').forEach(function(item) { item.classList.remove('active'); });
    const navMap = { 'menu': 0, 'premium': 1, 'rating': 2, 'profile': 3 };
    const index = navMap[page];
    if (index !== undefined) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[index]) navItems[index].classList.add('active');
    }
    if (page === 'menu') {
        switchTab('stars');
    } else if (page === 'premium') {
        switchTab('premium');
    } else if (page === 'rating') {
        switchTab('rating');
    } else if (page === 'profile') {
        switchTab('profile');
    }
};

window.switchTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    const tabEl = document.getElementById(tab + 'Tab');
    if (tabEl) tabEl.classList.add('active');
    const btnEl = document.querySelector('[data-tab="' + tab + '"]');
    if (btnEl) btnEl.classList.add('active');
    if (tab === 'requests') {
        loadUserRequests();
    }
};

window.buyPremiumPlan = function(months, price) {
    if (userBalance < price) {
        tg.showAlert("❌ Недостаточно средств!\n\nПополните баланс.");
        return;
    }
    
    const monthText = months === 3 ? '3 месяца' : months === 6 ? '6 месяцев' : '12 месяцев';
    
    tg.showConfirm(
        '💎 Оформить Telegram Premium на ' + monthText + '?\n\n💰 Стоимость: ' + price.toLocaleString() + " so'm",
        function(confirmed) {
            if (confirmed) {
                tg.sendData(JSON.stringify({
                    type: 'premium',
                    months: months,
                    price: price,
                    timestamp: new Date().toISOString()
                }));
                
                setTimeout(function() { loadUserBalance(); }, 1000);
                tg.showAlert('✅ Telegram Premium активирован на ' + monthText + '!\n\n💰 ' + price.toLocaleString() + " so'm");
            }
        }
    );
};

// ============================================
// 📬 СЛУШАЕМ ОТВЕТЫ ОТ БОТА
// ============================================
window.addEventListener('message', function(event) {
    console.log('📨 Получено:', event.data);
    
    if (event.data && typeof event.data === 'string') {
        if (event.data.startsWith('USER_BALANCE:')) {
            const balance = parseInt(event.data.replace('USER_BALANCE:', ''));
            userBalance = balance;
            updateBalance();
            console.log('✅ Баланс обновлён:', balance);
        }
        
        if (event.data.startsWith('PAYMENT_DETAILS:')) {
            const details = event.data.replace('PAYMENT_DETAILS:', '');
            paymentDetails = details;
            const detailsEl = document.getElementById('paymentDetailsDisplay');
            if (detailsEl) detailsEl.textContent = details;
        }
        
        if (event.data.startsWith('USER_REQUESTS:')) {
            const requestsData = JSON.parse(event.data.replace('USER_REQUESTS:', ''));
            displayRequests(requestsData);
        }
    }
});

// ============================================
// 🎯 ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен');
    
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        currentLang = savedLang;
        const modal = document.getElementById('languageModal');
        if (modal) modal.style.display = 'none';
        initApp();
    } else {
        const modal = document.getElementById('languageModal');
        if (modal) modal.style.display = 'flex';
    }
    
    loadData();
    loadUserBalance();
});

function initApp() {
    updateTexts();
    updatePriceDisplay();
    loadGifts();
    loadRating();
    loadProfile();
    updateBalance();
    tg.MainButton.setText(translations[currentLang].buyBtn);
    tg.MainButton.onClick(buyStars);
    tg.MainButton.show();
}

function updateTexts() {
    const t = translations[currentLang];
    const textElements = {
        'starsTitle': t.starsTitle,
        'recipientLabel': t.recipientLabel,
        'amountLabel': t.amountLabel,
        'giftTitle': t.giftTitle,
        'ratingTitle': t.ratingTitle,
        'profileTitle': t.profileTitle,
        'navMenu': t.menu,
        'navGift': t.gift,
        'navRating': t.rating,
        'navProfile': t.profile
    };
    for (const [id, text] of Object.entries(textElements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    const usernameInput = document.getElementById('username');
    if (usernameInput) usernameInput.placeholder = t.usernamePlaceholder;
    const selfBtn = document.getElementById('selfBtn');
    if (selfBtn) selfBtn.textContent = t.selfBtn;
    const customLabel = document.querySelectorAll('.form-label')[2];
    if (customLabel) customLabel.textContent = t.customLabel;
    const customInput = document.getElementById('customStars');
    if (customInput) customInput.placeholder = t.customPlaceholder;
    const customBtn = document.querySelector('.custom-btn');
    if (customBtn) customBtn.textContent = t.customBtn;
    const totalSpentLabel = document.querySelectorAll('.stat-label')[0];
    if (totalSpentLabel) totalSpentLabel.textContent = t.jami;
    const totalPurchasesLabel = document.querySelectorAll('.stat-label')[1];
    if (totalPurchasesLabel) totalPurchasesLabel.textContent = t.xaridlar;
    const historyTitle = document.querySelector('.history-title');
    if (historyTitle) historyTitle.textContent = t.tarix;
    tg.MainButton.setText(t.buyBtn);
}

function updateBalance() {
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = userBalance.toLocaleString() + " so'm";
        console.log('💰 Баланс на экране:', userBalance);
    }
}

function loadUserBalance() {
    console.log('📡 Запрос баланса...');
    tg.sendData(JSON.stringify({
        type: 'get_user_balance',
        timestamp: new Date().toISOString()
    }));
}

function buyStars() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        tg.showAlert("Username kiriting!");
        return;
    }
    const price = starPrices[selectedStars] || (selectedStars * 200);
    if (userBalance < price) {
        tg.showAlert(translations[currentLang].insufficientBalance);
        return;
    }
    addToHistory('stars', selectedStars, price, username);
    tg.sendData(JSON.stringify({
        type: 'stars',
        stars: selectedStars,
        username: username,
        price: price,
        timestamp: new Date().toISOString()
    }));
    setTimeout(function() { loadUserBalance(); }, 1000);
    tg.showAlert("✅ Muvaffaqiyatli!\n\n" + selectedStars + " ⭐\n" + price.toLocaleString() + " so'm");
}

function showTopupModal(amount) {
    const t = translations[currentLang];
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = '<div class="modal-content" style="max-width: 90%; width: 450px;">' +
        '<h2 style="margin-bottom: 25px;">' + t.topupTitle + '</h2>' +
        '<div style="margin-bottom: 20px;">' +
        '<label style="display: block; margin-bottom: 8px; color: #8b92a8; font-size: 14px;">' + t.topupAmount + ':</label>' +
        '<input type="number" id="topupAmountInput" value="' + (amount || 10000) + '" style="width: 100%; padding: 12px; background: rgba(30, 39, 54, 0.8); border: 2px solid #2d3a4f; border-radius: 8px; color: #fff; font-size: 18px; font-weight: 600;">' +
        '</div>' +
        '<div style="background: rgba(30, 39, 54, 0.8); padding: 20px; border-radius: 12px; margin-bottom: 20px;">' +
        '<p style="margin-bottom: 10px; color: #8b92a8; font-size: 14px;">Реквизиты для оплаты:</p>' +
        '<div id="paymentDetailsDisplay" style="background: #0f1419; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; font-size: 14px; line-height: 1.6; min-height: 80px;">' + paymentDetails + '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 10px;">' +
        '<button class="lang-btn" onclick="this.closest(\'.modal\').remove()" style="background: #2d3a4f; flex: 1;">' + t.cancel + '</button>' +
        '<button class="lang-btn" onclick="proceedToPaymentProof()" style="flex: 1;">Продолжить</button>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    tg.sendData(JSON.stringify({ type: 'get_payment_details', timestamp: new Date().toISOString() }));
}

function proceedToPaymentProof() {
    const amount = parseInt(document.getElementById('topupAmountInput').value) || 10000;
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    showPaymentProofModal(amount);
}

function showPaymentProofModal(amount) {
    const t = translations[currentLang];
    const user = tg.initDataUnsafe.user;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = '<div class="modal-content" style="max-width: 90%; width: 450px;">' +
        '<h2 style="margin-bottom: 25px;">Подтверждение оплаты</h2>' +
        '<div style="background: rgba(91, 155, 213, 0.2); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #5b9bd5;">' +
        '<p style="color: #5b9bd5; font-size: 18px; font-weight: 700; text-align: center;">Сумма: ' + amount.toLocaleString() + " so'm</p>" +
        '</div>' +
        '<div style="margin-bottom: 15px;">' +
        '<label style="display: block; margin-bottom: 8px; color: #8b92a8; font-size: 14px;">Ваш username:</label>' +
        '<input type="text" id="topupUsername" value="' + (user.username || '') + '" style="width: 100%; padding: 12px; background: rgba(30, 39, 54, 0.8); border: 2px solid #2d3a4f; border-radius: 8px; color: #fff; font-size: 16px;">' +
        '</div>' +
        '<div style="margin-bottom: 20px;">' +
        '<label style="display: block; margin-bottom: 8px; color: #8b92a8; font-size: 14px;">Чек/скриншот оплаты:</label>' +
        '<input type="text" id="topupProof" style="width: 100%; padding: 12px; background: rgba(30, 39, 54, 0.8); border: 2px solid #2d3a4f; border-radius: 8px; color: #fff; font-size: 16px;" placeholder="Например: TX123456">' +
        '</div>' +
        '<div style="display: flex; gap: 10px;">' +
        '<button class="lang-btn" onclick="this.closest(\'.modal\').remove()" style="background: #2d3a4f; flex: 1;">' + t.cancel + '</button>' +
        '<button class="lang-btn" onclick="submitTopupRequest(' + amount + ')" style="flex: 1; background: #5b9bd5;">' + t.sent + '</button>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
}

function submitTopupRequest(amount) {
    const username = document.getElementById('topupUsername').value.trim() || 'Не указан';
    const proof = document.getElementById('topupProof').value.trim() || 'Не предоставлен';
    if (!username || username === '@') {
        tg.showAlert('Введите username!');
        return;
    }
    tg.sendData(JSON.stringify({
        type: 'topup_request',
        amount: amount,
        username: username,
        proof: proof,
        timestamp: new Date().toISOString()
    }));
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    tg.showAlert('✅ Заявка отправлена!\n\nОжидайте подтверждения админа.');
}

function loadGifts() {
    const grid = document.getElementById('giftsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    gifts.forEach(function(gift) {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.innerHTML = '<div class="gift-emoji">' + gift.emoji + '</div>' +
            '<div class="gift-name">' + gift.name[currentLang] + '</div>' +
            '<div class="gift-stars">' + gift.stars + ' ⭐</div>' +
            '<div class="gift-price">' + gift.price.toLocaleString() + " so'm</div>";
        card.onclick = function() { buyGift(gift); };
        grid.appendChild(card);
    });
}

function buyGift(gift) {
    if (userBalance < gift.price) {
        tg.showAlert(translations[currentLang].insufficientBalance);
        return;
    }
    addToHistory('gift', gift.stars, gift.price, gift.name[currentLang]);
    tg.sendData(JSON.stringify({
        type: 'gift',
        gift: gift.name[currentLang],
        stars: gift.stars,
        price: gift.price,
        timestamp: new Date().toISOString()
    }));
    setTimeout(function() { loadUserBalance(); }, 1000);
    tg.showAlert("✅ Muvaffaqiyatli!\n\n" + gift.name[currentLang] + "\n" + gift.price.toLocaleString() + " so'm");
}

function loadRating() {
    const list = document.getElementById('ratingList');
    if (!list) return;
    const rating = [
        { name: 'Ali', spent: 250000, purchases: 15 },
        { name: 'Vali', spent: 180000, purchases: 10 },
        { name: 'Sardor', spent: 120000, purchases: 8 }
    ];
    list.innerHTML = '';
    rating.forEach(function(user, i) {
        const item = document.createElement('div');
        item.className = 'rating-item';
        item.innerHTML = '<div class="rating-position">#' + (i + 1) + '</div>' +
            '<div class="rating-avatar">' + user.name[0] + '</div>' +
            '<div class="rating-info">' +
            '<div class="rating-name">' + user.name + '</div>' +
            '<div class="rating-stats">' + user.purchases + ' xarid</div>' +
            '</div>' +
            '<div class="rating-value">' + user.spent.toLocaleString() + " so'm</div>";
        list.appendChild(item);
    });
}

function loadProfile() {
    const totalSpentEl = document.getElementById('totalSpentValue');
    const totalPurchasesEl = document.getElementById('totalPurchasesValue');
    if (totalSpentEl) totalSpentEl.textContent = userData.totalSpent.toLocaleString() + " so'm";
    if (totalPurchasesEl) totalPurchasesEl.textContent = userData.totalPurchases;
    const list = document.getElementById('historyList');
    if (!list) return;
    if (userData.history.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:#8b92a8">' + translations[currentLang].noHistory + '</div>';
        return;
    }
    list.innerHTML = '';
    userData.history.slice().reverse().slice(0, 10).forEach(function(item) {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = '<div class="history-header"><div class="history-type">' + (item.type === 'stars' ? '⭐ Stars' : '🎁 ' + item.details) + '</div><div class="history-amount">' + item.price.toLocaleString() + " so'm</div></div><div class="history-details">' + item.stars + ' ⭐</div><div class="history-date">' + new Date(item.timestamp).toLocaleString() + '</div>';
        list.appendChild(div);
    });
}

function addToHistory(type, stars, price, details) {
    userData.history.push({ type: type, stars: stars, price: price, details: details, timestamp: new Date().toISOString() });
    userData.totalSpent += price;
    userData.totalPurchases += 1;
    saveData();
    loadProfile();
}

function saveData() {
    localStorage.setItem('userData', JSON.stringify(userData));
}

function loadData() {
    const saved = localStorage.getItem('userData');
    if (saved) userData = JSON.parse(saved);
}

function loadUserRequests() {
    const requestsList = document.getElementById('requestsList');
    tg.sendData(JSON.stringify({
        type: 'get_user_requests',
        timestamp: new Date().toISOString()
    }));
}

function displayRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requests || requests.length === 0) {
        requestsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #8b92a8;"><div style="font-size: 48px; margin-bottom: 16px;">📭</div><div>Нет заявок</div></div>';
        return;
    }
    requests.reverse();
    let html = '';
    requests.forEach(function(req) {
        const statusClass = req.status;
        const statusText = {
            'pending': '⏳ Ожидает',
            'approved': '✅ Одобрена',
            'rejected': '❌ Отклонена'
        }[req.status] || req.status;
        const date = new Date(req.created_at).toLocaleString('ru-RU');
        html += '<div class="request-card">' +
            '<div class="request-header"><span class="request-id">#' + req.id + '</span><span class="request-amount">' + req.amount.toLocaleString() + " so'm</span></div>" +
            '<div class="request-status ' + statusClass + '">' + statusText + '</div>' +
            '<div class="request-proof">📄 Чек: ' + (req.payment_proof || 'Не загружен') + '</div>' +
            '<div class="request-date">🕐 ' + date + '</div>' +
            (req.status === 'pending' ? '<button class="upload-proof-btn" onclick="uploadProof(' + req.id + ')">📸 Загрузить чек</button>' : '') +
            '</div>';
    });
    requestsList.innerHTML = html;
}

function uploadProof(requestId) {
    tg.showAlert('📸 Загрузка чека\n\nОтправьте фото/скриншот чека боту в личные сообщения.\n\nЧек будет автоматически привязан к заявке #' + requestId);
}

tg.ready();