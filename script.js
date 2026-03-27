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
        customAmountLabel: 'Или введите свою сумму',
        customAmountPlaceholder: 'Например: 150',
        customAmountBtn: 'Добавить',
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
        currency: 'so\'m',
        noHistory: 'История покупок пуста',
        selectGift: 'Выберите подарок',
        purchaseSuccess: 'Покупка успешна!',
        confirmPurchase: 'Подтвердить покупку',
        insufficientBalance: 'Недостаточно средств',
        topupBalance: 'Пополнить баланс',
        topupTitle: 'Пополнение баланса',
        topupAmount: 'Сумма пополнения',
        topupProof: 'Скриншот оплаты',
        topupSubmit: 'Отправить заявку',
        topupSuccess: 'Заявка отправлена админу',
        lang: 'RU'
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
        customAmountLabel: "Yoki o'z miqdoringizni kiriting",
        customAmountPlaceholder: "Masalan: 150",
        customAmountBtn: "Qo'shish",
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
        confirmPurchase: "Xaridni tasdiqlash",
        insufficientBalance: "Mablag' yetarli emas",
        topupBalance: "Balansni to'ldirish",
        topupTitle: "Balansni to'ldirish",
        topupAmount: "To'ldirish summasi",
        topupProof: "To'lov skrinshoti",
        topupSubmit: "Zayavka yuborish",
        topupSuccess: "Zayavka adminga yuborildi",
        lang: 'UZ'
    }
};

// Prices (always in soms)
const starPrices = {
    50: 10000,
    75: 14000,
    100: 18000,
    250: 42000,
    500: 80000
};

// Gifts
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
let selectedGift = null;
let userBalance = 0;
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
    tg.MainButton.onClick(() => {
        buyStars();
    });
}

function updateTexts() {
    const t = translations[currentLang];
    
    // Update all text elements
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
    
    // Update tab buttons
    document.querySelector('[data-tab="stars"]').textContent = t.starsTab;
    document.querySelector('[data-tab="gift"]').textContent = t.giftTab;
    document.querySelector('[data-tab="rating"]').textContent = t.ratingTab;
    
    // Update custom amount section
    const customLabel = document.querySelector('.custom-amount-label');
    if (customLabel) {
        customLabel.textContent = t.customAmountLabel;
    }
    const customInput = document.getElementById('customStarsAmount');
    if (customInput) {
        customInput.placeholder = t.customAmountPlaceholder;
    }
    const customBtn = document.querySelector('.custom-amount-btn');
    if (customBtn) {
        customBtn.textContent = t.customAmountBtn;
    }
}

function updateBalance() {
    const t = translations[currentLang];
    document.getElementById('balance').textContent = `${userBalance.toLocaleString()} ${t.currency}`;
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

function setCustomStars() {
    const customAmount = parseInt(document.getElementById('customStarsAmount').value);
    
    if (customAmount && customAmount > 0) {
        selectedStars = customAmount;
        document.getElementById('starsAmount').value = customAmount;
        
        // Calculate price (200 soms per star)
        const price = customAmount * 200;
        
        updatePriceDisplayCustom(price);
        
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        tg.MainButton.show();
    }
}

function updatePriceDisplay() {
    const price = starPrices[selectedStars] || (selectedStars * 200);
    const t = translations[currentLang];
    document.getElementById('priceDisplay').textContent = `${price.toLocaleString()} ${t.currency}`;
}

function updatePriceDisplayCustom(price) {
    const t = translations[currentLang];
    document.getElementById('priceDisplay').textContent = `${price.toLocaleString()} ${t.currency}`;
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
    
    const price = starPrices[selectedStars] || (selectedStars * 200);
    
    if (userBalance < price) {
        const t = translations[currentLang];
        tg.showPopup({
            title: t.insufficientBalance,
            message: `${t.topupBalance}?\n${t.balance || 0} / ${price} ${t.currency}`,
            buttons: [
                { id: 'topup', type: 'ok', text: t.topupBalance },
                { id: 'cancel', type: 'cancel' }
            ]
        }, (buttonId) => {
            if (buttonId === 'topup') {
                showTopupModal(price);
            }
        });
        return;
    }
    
    // Save to history
    addToHistory('stars', selectedStars, price, username);
    
    const data = {
        type: 'stars',
        stars: selectedStars,
        username: username,
        price: price,
        currency: 'UZS',
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(data));
    tg.showPopup({
        title: translations[currentLang].purchaseSuccess,
        message: `${selectedStars} ⭐\n${price.toLocaleString()} ${translations[currentLang].currency}`,
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
        message: `${t.topupAmount}: ${amount || 10Конечно! Вот все файлы полностью готовые к замене:

---

## 📄 **database.py** (НОВЫЙ ФАЙЛ - создайте)

```python
import json
import os
from datetime import datetime

DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'admin_settings': {
            'star_prices': {
                50: 10000,
                75: 14000,
                100: 18000,
                250: 42000,
                500: 80000
            },
            'gifts': [
                {'id': 1, 'emoji': '🌹', 'name': 'Atirgul', 'stars': 15, 'price': 3000},
                {'id': 2, 'emoji': '🔥', 'name': 'Olov', 'stars': 20, 'price': 4000},
                {'id': 3, 'emoji': '💎', 'name': 'Olmos', 'stars': 30, 'price': 6000},
                {'id': 4, 'emoji': '👑', 'name': 'Toj', 'stars': 50, 'price': 10000},
                {'id': 5, 'emoji': '🚀', 'name': 'Raketa', 'stars': 75, 'price': 15000},
                {'id': 6, 'emoji': '🏆', 'name': 'Kubok', 'stars': 100, 'price': 20000}
            ],
            'payment_details': "Karta: 8600 1234 5678 9012\nTelefon: +998 90 123 45 67",
            'admin_id': None
        },
        'users': {},
        'topup_requests': [],
        'purchases': []
    }

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_user(user_id):
    data = load_data()
    if str(user_id) not in data['users']:
        data['users'][str(user_id)] = {
            'user_id': user_id,
            'username': '',
            'balance': 0,
            'language': 'uz',
            'total_spent': 0,
            'purchases': []
        }
        save_data(data)
    return data['users'][str(user_id)]

def update_user(user_id, updates):
    data = load_data()
    if str(user_id) in data['users']:
        data['users'][str(user_id)].update(updates)
        save_data(data)

def add_balance(user_id, amount):
    data = load_data()
    if str(user_id) in data['users']:
        data['users'][str(user_id)]['balance'] += amount
        save_data(data)

def deduct_balance(user_id, amount):
    data = load_data()
    if str(user_id) in data['users']:
        if data['users'][str(user_id)]['balance'] >= amount:
            data['users'][str(user_id)]['balance'] -= amount
            data['users'][str(user_id)]['total_spent'] += amount
            save_data(data)
            return True
    return False

def create_topup_request(user_id, amount, payment_proof):
    data = load_data()
    request = {
        'id': len(data['topup_requests']) + 1,
        'user_id': user_id,
        'username': data['users'].get(str(user_id), {}).get('username', 'Unknown'),
        'amount': amount,
        'payment_proof': payment_proof,
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    data['topup_requests'].append(request)
    save_data(data)
    return request

def get_pending_topups():
    data = load_data()
    return [r for r in data['topup_requests'] if r['status'] == 'pending']

def approve_topup(request_id):
    data = load_data()
    for request in data['topup_requests']:
        if request['id'] == request_id:
            request['status'] = 'approved'
            user_id = request['user_id']
            amount = request['amount']
            if str(user_id) in data['users']:
                data['users'][str(user_id)]['balance'] += amount
            save_data(data)
            return request
    return None

def reject_topup(request_id):
    data = load_data()
    for request in data['topup_requests']:
        if request['id'] == request_id:
            request['status'] = 'rejected'
            save_data(data)
            return request
    return None

def add_purchase(user_id, item_type, stars, price, details=''):
    data = load_data()
    purchase = {
        'user_id': user_id,
        'username': data['users'].get(str(user_id), {}).get('username', 'Unknown'),
        'type': item_type,
        'stars': stars,
        'price': price,
        'details': details,
        'timestamp': datetime.now().isoformat()
    }
    data['purchases'].append(purchase)
    if str(user_id) in data['users']:
        data['users'][str(user_id)]['purchases'].append(purchase)
        data['users'][str(user_id)]['total_spent'] += price
    save_data(data)

def get_user_purchases(user_id, limit=10):
    data = load_data()
    user_purchases = [p for p in data['purchases'] if p['user_id'] == user_id]
    return user_purchases[-limit:]

def get_top_users(limit=10):
    data = load_data()
    users = list(data['users'].values())
    users.sort(key=lambda x: x['total_spent'], reverse=True)
    return users[:limit]

def update_admin_settings(settings):
    data = load_data()
    data['admin_settings'].update(settings)
    save_data(data)

def get_admin_settings():
    data = load_data()
    return data['admin_settings']