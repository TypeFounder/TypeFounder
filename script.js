const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#1a1f2e');
tg.setBackgroundColor('#0f1419');

const translations = {
    ru: {
        // ... существующие переводы
        cancel: 'Отмена',
        sent: 'Отправил',
        customLabel: 'Или своя сумма',
        customPlaceholder: '150',
        customBtn: 'OK'
        starsTitle: 'Telegram Stars',
        recipientLabel: 'Получатель',
        usernamePlaceholder: 'Username',
        selfBtn: 'Себе',
        amountLabel: 'Количество',
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
        lang: 'RU'
    },
    uz: {
        // ... существующие переводы
        cancel: 'Bekor qilish',
        sent: "Yubordim",
        customLabel: "Yoki o'z miqdoringiz",
        customPlaceholder: '150',
        customBtn: 'OK'
        starsTitle: 'Telegram Stars',
        recipientLabel: 'Qabul qiluvchi',
        usernamePlaceholder: 'Username',
        selfBtn: "O'zim",
        amountLabel: 'Miqdori',
        customLabel: 'Yoki o\'z miqdoringiz',
        customPlaceholder: '150',
        customBtn: 'OK',
        buyBtn: 'Sotib olish',
        giftTitle: 'Sovg\'alar',
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
        lang: 'UZ'
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

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        currentLang = savedLang;
        document.getElementById('languageModal').style.display = 'none';
        initApp();
    } else {
        document.getElementById('languageModal').style.display = 'flex';
    }
    
    loadData();
});

function selectLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.getElementById('languageModal').style.display = 'none';
    initApp();
}

function toggleLanguage() {
    currentLang = currentLang === 'uz' ? 'ru' : 'uz';
    localStorage.setItem('language', currentLang);
    document.getElementById('currentLangText').textContent = translations[currentLang].lang;
    initApp();
}

function initApp() {
    updateTexts();
    updatePriceDisplay();
    loadGifts();
    loadRating();
    loadProfile();
    updateBalance();
    
    tg.MainButton.setText(translations[currentLang].buyBtn);
    tg.MainButton.onClick(() => buyStars());
}

function updateTexts() {
    const t = translations[currentLang];
    
    document.getElementById('starsTitle').textContent = t.starsTitle;
    document.getElementById('recipientLabel').textContent = t.recipientLabel;
    document.getElementById('username').placeholder = t.usernamePlaceholder;
    document.getElementById('selfBtn').textContent = t.selfBtn;
    document.getElementById('amountLabel').textContent = t.amountLabel;
    document.getElementById('giftTitle').textContent = t.giftTitle;
    document.getElementById('ratingTitle').textContent = t.ratingTitle;
    document.getElementById('profileTitle').textContent = t.profileTitle;
    
    // Обновляем label для custom amount
    const customLabel = document.querySelector('.form-group .form-label:last-of-type');
    if (customLabel) {
        customLabel.textContent = t.customLabel;
    }
    
    // Обновляем placeholder и кнопку
    const customInput = document.getElementById('customStars');
    if (customInput) {
        customInput.placeholder = t.customPlaceholder;
    }
    
    const customBtn = document.querySelector('.custom-btn');
    if (customBtn) {
        customBtn.textContent = t.customBtn;
    }
    
    tg.MainButton.setText(t.buyBtn);
}

function updateBalance() {
    document.getElementById('balance').textContent = `${userBalance.toLocaleString()} so'm`;
}

function selectStars(amount) {
    selectedStars = amount;
    document.getElementById('starsAmount').value = amount;
    updatePriceDisplay();
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === amount);
    });
    
    tg.MainButton.show();
}

function setCustomStars() {
    const custom = parseInt(document.getElementById('customStars').value);
    if (custom && custom > 0) {
        selectedStars = custom;
        document.getElementById('starsAmount').value = custom;
        const price = custom * 200;
        document.getElementById('priceDisplay').textContent = `${price.toLocaleString()} so'm`;
        document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
        tg.MainButton.show();
    }
}

function updatePriceDisplay() {
    const price = starPrices[selectedStars] || (selectedStars * 200);
    document.getElementById('priceDisplay').textContent = `${price.toLocaleString()} so'm`;
}

function setSelf() {
    const user = tg.initDataUnsafe.user;
    if (user) {
        document.getElementById('username').value = user.username || user.first_name;
    }
}

function buyStars() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        tg.showAlert("Username kiriting!");
        return;
    }
    
    const price = starPrices[selectedStars] || (selectedStars * 200);
    
    if (userBalance < price) {
        tg.showPopup({
            title: translations[currentLang].insufficientBalance,
            message: `${userBalance} / ${price} so'm\n\nPopolasizmi?`,
            buttons: [
                { id: 'topup', type: 'ok', text: 'Ha' },
                { id: 'cancel', type: 'cancel' }
            ]
        }, (btn) => {
            if (btn === 'topup') showTopupModal(price);
        });
        return;
    }
    
    addToHistory('stars', selectedStars, price, username);
    
    tg.sendData(JSON.stringify({
        type: 'stars',
        stars: selectedStars,
        username: username,
        price: price,
        currency: 'UZS',
        timestamp: new Date().toISOString()
    }));
    
    tg.showPopup({
        title: "Muvaffaqiyatli!",
        message: `${selectedStars} ⭐\n${price.toLocaleString()} so'm`,
        buttons: [{ id: 'ok', type: 'ok' }]
    }, () => {
        userBalance -= price;
        updateBalance();
        tg.close();
    });
}

function showTopupModal(amount) {
    const t = translations[currentLang];
    
    tg.showPopup({
        title: t.topupTitle,
        message: `${t.topupAmount}: ${amount || 10000} so'm\n\n${t.topupProof} (cheK raqami)`,
        buttons: [
            { id: 'submit', type: 'ok', text: t.topupSubmit },
            { id: 'cancel', type: 'cancel' }
        ]
    }, (btn, proof) => {
        if (btn === 'submit') {
            tg.sendData(JSON.stringify({
                type: 'topup',
                amount: amount || 10000,
                proof: proof || 'Yo\'q',
                timestamp: new Date().toISOString()
            }));
            tg.showAlert(t.topupSuccess);
        }
    });
}

function loadGifts() {
    const grid = document.getElementById('giftsGrid');
    if (!grid) {
        console.error('Gifts grid not found');
        return;
    }
    
    grid.innerHTML = '';
    
    gifts.forEach(gift => {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.innerHTML = `
            <div class="gift-emoji">${gift.emoji}</div>
            <div class="gift-name">${gift.name[currentLang]}</div>
            <div class="gift-stars">${gift.stars} ⭐</div>
            <div class="gift-price">${gift.price.toLocaleString()} so'm</div>
        `;
        card.onclick = () => buyGift(gift);
        grid.appendChild(card);
    });
    
    console.log('Gifts loaded:', gifts.length);
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
    
    tg.showPopup({
        title: "Muvaffaqiyatli!",
        message: `${gift.name[currentLang]}\n${gift.price.toLocaleString()} so'm`,
        buttons: [{ id: 'ok', type: 'ok' }]
    }, () => {
        userBalance -= gift.price;
        updateBalance();
    });
}

function loadRating() {
    const list = document.getElementById('ratingList');
    const rating = [
        { name: 'Ali', spent: 250000, purchases: 15 },
        { name: 'Vali', spent: 180000, purchases: 10 },
        { name: 'Sardor', spent: 120000, purchases: 8 }
    ];
    
    list.innerHTML = '';
    rating.forEach((user, i) => {
        const item = document.createElement('div');
        item.className = 'rating-item';
        item.innerHTML = `
            <div class="rating-position">#${i + 1}</div>
            <div class="rating-avatar">${user.name[0]}</div>
            <div class="rating-info">
                <div class="rating-name">${user.name}</div>
                <div class="rating-stats">${user.purchases} xarid</div>
            </div>
            <div class="rating-value">${user.spent.toLocaleString()} so'm</div>
        `;
        list.appendChild(item);
    });
}

function loadProfile() {
    document.getElementById('totalSpentValue').textContent = `${userData.totalSpent.toLocaleString()} so'm`;
    document.getElementById('totalPurchasesValue').textContent = userData.totalPurchases;
    
    const list = document.getElementById('historyList');
    if (userData.history.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px;color:#8b92a8">${translations[currentLang].noHistory}</div>`;
        return;
    }
    
    list.innerHTML = '';
    userData.history.slice().reverse().slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-header">
                <div class="history-type">${item.type === 'stars' ? '⭐ Stars' : '🎁 ' + item.details}</div>
                <div class="history-amount">${item.price.toLocaleString()} so'm</div>
            </div>
            <div class="history-details">${item.stars} ⭐</div>
            <div class="history-date">${new Date(item.timestamp).toLocaleString()}</div>
        `;
        list.appendChild(div);
    });
}

function addToHistory(type, stars, price, details) {
    userData.history.push({ type, stars, price, details, timestamp: new Date().toISOString() });
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

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    navTo(tab);
}

function navTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    if (page === 'menu') switchTab('stars');
    else if (['gift', 'rating', 'profile'].includes(page)) switchTab(page);
}

function showTopupModal(amount) {
    const t = translations[currentLang];
    
    // Создаем модальное окно с реквизитами
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; width: 400px;">
            <h2 style="margin-bottom: 20px;">${t.topupTitle}</h2>
            <div style="background: rgba(30, 39, 54, 0.8); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px; color: #8b92a8;">${t.topupAmount}:</p>
                <p style="font-size: 24px; font-weight: 700; color: #5b9bd5; margin-bottom: 20px;">
                    ${(amount || 10000).toLocaleString()} so'm
                </p>
                <p style="margin-bottom: 10px; color: #8b92a8;">Реквизиты для оплаты:</p>
                <div id="paymentDetails" style="background: #0f1419; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; margin-bottom: 15px;">
                    Загрузка...
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="lang-btn" onclick="this.closest('.modal').remove()" style="background: #2d3a4f; flex: 1;">
                    ${t.cancel || 'Отмена'}
                </button>
                <button class="lang-btn" onclick="submitTopup(${amount || 10000})" style="flex: 1;">
                    ${t.sent || 'Отправил'}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Загружаем реквизиты от бота
    fetchPaymentDetails();
}

function fetchPaymentDetails() {
    // Запрашиваем реквизиты у бота
    tg.sendData(JSON.stringify({
        type: 'get_payment_details',
        timestamp: new Date().toISOString()
    }));
}

function submitTopup(amount) {
    const t = translations[currentLang];
    
    tg.showPopup({
        title: t.topupTitle,
        message: "Отправьте скриншот/чек оплаты\n\nПосле подтверждения админом, баланс пополнится.",
        buttons: [
            { id: 'confirm', type: 'ok', text: t.sent || 'Отправил' },
            { id: 'cancel', type: 'cancel' }
        ]
    }, (buttonId) => {
        if (buttonId === 'confirm') {
            // Отправляем заявку админу
            tg.sendData(JSON.stringify({
                type: 'topup_request',
                amount: amount,
                proof: 'Ожидает подтверждения',
                timestamp: new Date().toISOString()
            }));
            
            // Закрываем модалку
            document.querySelector('.modal').remove();
            
            tg.showAlert(t.topupSuccess || 'Заявка отправлена админу!');
        }
    });
}

// Получаем реквизиты от бота
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'payment_details') {
        const detailsEl = document.getElementById('paymentDetails');
        if (detailsEl) {
            detailsEl.textContent = event.data.details;
        }
    }
});

function closeApp() {
    tg.close();
}

tg.ready();