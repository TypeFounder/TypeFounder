const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#1a1f2e');
tg.setBackgroundColor('#0f1419');

// Translations
const translations = {
    ru: {
        appTitle: 'Uz Give',
        starsTab: 'Купить звёзды',
        giftTab: 'Подарки',
        ratingTab: 'Рейтинг',
        profileTab: 'Профиль',
        starsTitle: 'Купить Telegram Stars',
        recipientLabel: 'Получатель',
        usernamePlaceholder: 'Введите username',
        selfBtn: 'Себе',
        amountLabel: 'Количество звёзд',
        buyBtn: 'Купить',
        giftTitle: 'Telegram подарки',
        ratingTitle: 'Топ пользователи',
        profileTitle: 'Профиль',
        totalSpent: 'Всего потрачено',
        totalPurchases: 'Всего покупок',
        historyTitle: 'История покупок',
        navMenu: 'Меню',
        navGift: 'Подарки',
        navRating: 'Рейтинг',
        navProfile: 'Профиль',
        currency: '₽',
        noHistory: 'История покупок пуста',
        selectGift: 'Выберите подарок',
        purchaseSuccess: 'Покупка успешна!',
        confirmPurchase: 'Подтвердить покупку'
    },
    uz: {
        appTitle: 'Uz Give',
        starsTab: "Stars olish",
        giftTab: 'Gift',
        ratingTab: 'Reyting',
        profileTab: 'Profil',
        starsTitle: "Telegram Stars sotib olish",
        recipientLabel: "Qabul qiluvchi",
        usernamePlaceholder: "Username kiriting",
        selfBtn: "O'zim uchun",
        amountLabel: "Stars miqdori",
        buyBtn: "Sotib olish",
        giftTitle: "Telegram sovg'alar",
        ratingTitle: "Top foydalanuvchilar",
        profileTitle: "Profil",
        totalSpent: "Jami sarflangan",
        totalPurchases: "Xaridlar soni",
        historyTitle: "Xaridlar tarixi",
        navMenu: "Menyu",
        navGift: "Gift",
        navRating: "Reyting",
        navProfile: "Profil",
        currency: "so'm",
        noHistory: "Xaridlar tarixi bo'sh",
        selectGift: "Sovg'ani tanlang",
        purchaseSuccess: "Xarid muvaffaqiyatli!",
        confirmPurchase: "Xaridni tasdiqlash"
    }
};

// Prices
const starPrices = {
    50: { uz: 10000, ru: 150 },
    75: { uz: 14000, ru: 210 },
    100: { uz: 18000, ru: 270 },
    250: { uz: 42000, ru: 630 },
    500: { uz: 80000, ru: 1200 }
};

// Gifts (15-100 stars)
const gifts = [
    { id: 1, emoji: '🌹', name: { ru: 'Роза', uz: 'Atirgul' }, stars: 15 },
    { id: 2, emoji: '🔥', name: { ru: 'Огонь', uz: 'Olov' }, stars: 20 },
    { id: 3, emoji: '💎', name: { ru: 'Бриллиант', uz: 'Olmos' }, stars: 30 },
    { id: 4, emoji: '👑', name: { ru: 'Корона', uz: 'Toj' }, stars: 50 },
    { id: 5, emoji: '🚀', name: { ru: 'Ракета', uz: 'Raketa' }, stars: 75 },
    { id: 6, emoji: '🏆', name: { ru: 'Трофей', uz: 'Kubok' }, stars: 100 }
];

let currentLang = 'uz';
let selectedStars = 50;
let selectedGift = null;
let userData = {
    username: '',
    balance: 0,
    history: [],
    totalSpent: 0,
    totalPurchases: 0
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check language
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        currentLang = savedLang;
        document.getElementById('languageModal').style.display = 'none';
        initApp();
    } else {
        document.getElementById('languageModal').style.display = 'flex';
    }
    
    // Get user data from Telegram
    const user = tg.initDataUnsafe.user;
    if (user) {
        userData.username = user.username || user.first_name;
    }
    
    // Load saved data
    loadData();
});

function selectLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.getElementById('languageModal').style.display = 'none';
    initApp();
}

function initApp() {
    updateTexts();
    updatePriceDisplay();
    loadGifts();
    loadRating();
    loadProfile();
    tg.MainButton.setText(translations[currentLang].buyBtn);
    tg.MainButton.onClick(() => {
        buyStars();
    });
}

function updateTexts() {
    const t = translations[currentLang];
    document.getElementById('starsTitle').textContent = t.starsTitle;
    document.getElementById('recipientLabel').textContent = t.recipientLabel;
    document.getElementById('username').placeholder = t.usernamePlaceholder;
    document.getElementById('selfBtn').textContent = t.selfBtn;
    document.getElementById('amountLabel').textContent = t.amountLabel;
    document.getElementById('buyBtn').textContent = t.buyBtn;
    document.getElementById('giftTitle').textContent = t.giftTitle;
    document.getElementById('ratingTitle').textContent = t.ratingTitle;
    document.getElementById('profileTitle').textContent = t.profileTitle;
    document.getElementById('totalSpent').textContent = t.totalSpent;
    document.getElementById('totalPurchases').textContent = t.totalPurchases;
    document.getElementById('historyTitle').textContent = t.historyTitle;
    document.getElementById('navMenu').textContent = t.navMenu;
    document.getElementById('navGift').textContent = t.navGift;
    document.getElementById('navRating').textContent = t.navRating;
    document.getElementById('navProfile').textContent = t.navProfile;
    
    // Update currency symbols
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = t.currency;
    });
    
    // Update tab buttons
    document.querySelector('[data-tab="stars"]').textContent = t.starsTab;
    document.querySelector('[data-tab="gift"]').textContent = t.giftTab;
    document.querySelector('[data-tab="rating"]').textContent = t.ratingTab;
}

function selectStars(amount) {
    selectedStars = amount;
    document.getElementById('starsAmount').value = amount;
    updatePriceDisplay();
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === amount) {
            btn.classList.add('active');
        }
    });
    
    tg.MainButton.show();
}

function updatePriceDisplay() {
    const price = starPrices[selectedStars] ? starPrices[selectedStars][currentLang] : 0;
    document.getElementById('priceDisplay').textContent = `${price.toLocaleString()} ${translations[currentLang].currency}`;
}

function setSelf() {
    const user = tg.initDataUnsafe.user;
    if (user && user.username) {
        document.getElementById('username').value = user.username;
    } else if (user && user.first_name) {
        document.getElementById('username').value = user.first_name;
    } else {
        tg.showAlert(currentLang === 'uz' ? "Username topilmadi" : "Username не найден");
    }
}

function buyStars() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        tg.showAlert(currentLang === 'uz' ? "Username kiriting!" : "Введите username!");
        return;
    }
    
    const price = starPrices[selectedStars][currentLang];
    
    // Save to history
    addToHistory('stars', selectedStars, price, username);
    
    const data = {
        type: 'stars',
        stars: selectedStars,
        username: username,
        price: price,
        currency: currentLang === 'ru' ? 'RUB' : 'UZS',
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(data));
    tg.showPopup({
        title: translations[currentLang].purchaseSuccess,
        message: `${selectedStars} ⭐\n${price.toLocaleString()} ${translations[currentLang].currency}`,
        buttons: [{ id: 'ok', type: 'ok' }]
    }, () => {
        tg.close();
    });
}

function loadGifts() {
    const grid = document.getElementById('giftsGrid');
    grid.innerHTML = '';
    
    gifts.forEach(gift => {
        const card = document.createElement('div');
        card.className = 'gift-card';
        card.onclick = () => selectGift(gift);
        
        const price = getGiftPrice(gift.stars);
        
        card.innerHTML = `
            <div class="gift-emoji">${gift.emoji}</div>
            <div class="gift-name">${gift.name[currentLang]}</div>
            <div class="gift-stars">${gift.stars} ⭐</div>
            <div class="gift-price">${price.toLocaleString()} ${translations[currentLang].currency}</div>
        `;
        
        grid.appendChild(card);
    });
}

function selectGift(gift) {
    selectedGift = gift;
    
    document.querySelectorAll('.gift-card').forEach((card, index) => {
        if (gifts[index].id === gift.id) {
            card.classList.add('add');
        } else {
            card.classList.remove('active');
        }
    });
    
    const price = getGiftPrice(gift.stars);
    
    tg.showPopup({
        title: gift.name[currentLang],
        message: `${gift.stars} ⭐\n${price.toLocaleString()} ${translations[currentLang].currency}\n\n${translations[currentLang].confirmPurchase}?`,
        buttons: [
            { id: 'buy', type: 'ok', text: translations[currentLang].buyBtn },
            { id: 'cancel', type: 'cancel' }
        ]
    }, (buttonId) => {
        if (buttonId === 'buy') {
            buyGift(gift, price);
        }
    });
}

function buyGift(gift, price) {
    const username = tg.initDataUnsafe.user?.username || tg.initDataUnsafe.user?.first_name || 'Unknown';
    
    addToHistory('gift', gift.stars, price, gift.name[currentLang]);
    
    const data = {
        type: 'gift',
        gift: gift.name[currentLang],
        stars: gift.stars,
        price: price,
        username: username,
        currency: currentLang === 'ru' ? 'RUB' : 'UZS',
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(data));
    loadProfile();
}

function getGiftPrice(stars) {
    // Simple price calculation based on stars
    if (currentLang === 'uz') {
        return Math.round(stars * 200);
    } else {
        return Math.round(stars * 3);
    }
}

function loadRating() {
    const list = document.getElementById('ratingList');
    
    // Sample rating data (in real app, load from backend)
    const rating = [
        { name: 'Ali', spent: 250000, purchases: 15 },
        { name: 'Vali', spent: 180000, purchases: 10 },
        { name: 'Sardor', spent: 120000, purchases: 8 },
        { name: 'Rustam', spent: 95000, purchases: 6 },
        { name: 'Dilshod', spent: 75000, purchases: 5 }
    ];
    
    list.innerHTML = '';
    
    rating.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'rating-item';
        
        let positionClass = '';
        if (index === 0) positionClass = 'gold';
        else if (index === 1) positionClass = 'silver';
        else if (index === 2) positionClass = 'bronze';
        
        const currency = translations[currentLang].currency;
        
        item.innerHTML = `
            <div class="rating-position ${positionClass}">#${index + 1}</div>
            <div class="rating-avatar">${user.name[0]}</div>
            <div class="rating-info">
                <div class="rating-name">${user.name}</div>
                <div class="rating-stats">${user.purchases} ${currentLang === 'uz' ? 'xarid' : 'покупок'}</div>
            </div>
            <div class="rating-value">${user.spent.toLocaleString()} ${currency}</div>
        `;
        
        list.appendChild(item);
    });
}

function loadProfile() {
    document.getElementById('totalSpentValue').textContent = `${userData.totalSpent.toLocaleString()} ${translations[currentLang].currency}`;
    document.getElementById('totalPurchasesValue').textContent = userData.totalPurchases;
    
    const list = document.getElementById('historyList');
    
    if (userData.history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-text">${translations[currentLang].noHistory}</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = '';
    
    // Show last 10 purchases
    userData.history.slice().reverse().slice(0, 10).forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        div.innerHTML = `
            <div class="history-header">
                <div class="history-type">${item.type === 'stars' ? '⭐ Stars' : '🎁 ' + item.details}</div>
                <div class="history-amount">${item.price.toLocaleString()} ${translations[currentLang].currency}</div>
            </div>
            <div class="history-details">${item.stars} ⭐ | ${item.username}</div>
            <div class="history-date">${dateStr}</div>
        `;
        
        list.appendChild(div);
    });
}

function addToHistory(type, stars, price, details) {
    userData.history.push({
        type,
        stars,
        price,
        details,
        username: tg.initDataUnsafe.user?.username || 'Unknown',
        timestamp: new Date().toISOString()
    });
    
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
    if (saved) {
        userData = JSON.parse(saved);
    }
}

function switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tab + 'Tab').classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update nav
    navTo(tab);
}

function navTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    
    if (page === 'menu') {
        switchTab('stars');
    } else if (page === 'gift') {
        switchTab('gift');
    } else if (page === 'rating') {
        switchTab('rating');
    } else if (page === 'profile') {
        switchTab('profile');
    }
}

function addBalance() {
    tg.showAlert(currentLang === 'uz' ? "Tez orada" : "Скоро");
}

function closeApp() {
    tg.close();
}

tg.ready();