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
    
    // Обновляем все текстовые элементы
    document.getElementById('starsTitle').textContent = t.starsTitle;
    document.getElementById('recipientLabel').textContent = t.recipientLabel;
    document.getElementById('username').placeholder = t.usernamePlaceholder;
    document.getElementById('selfBtn').textContent = t.selfBtn;
    document.getElementById('amountLabel').textContent = t.amountLabel;
    document.getElementById('giftTitle').textContent = t.giftTitle;
    document.getElementById('ratingTitle').textContent = t.ratingTitle;
    document.getElementById('profileTitle').textContent = t.profileTitle;
    
    // Обновляем кнопку покупки
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

function addBalance() {
    showTopupModal();
}

function closeApp() {
    tg.close();
}

tg.ready();