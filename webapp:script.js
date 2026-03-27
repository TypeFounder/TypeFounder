// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();

// Устанавливаем цвета темы
tg.setHeaderColor('#1a1f2e');
tg.setBackgroundColor('#0f1419');

// Данные о ценах
const starPrices = {
    50: 10000,
    75: 14000,
    100: 18000,
    250: 42000,
    500: 80000
};

let selectedStars = 50;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    updatePriceDisplay(50);
    
    const user = tg.initDataUnsafe.user;
    if (user) {
        console.log('User:', user);
    }
    
    tg.MainButton.setText("SOTIB OLISH");
    tg.MainButton.onClick(() => {
        buyStars();
    });
});

// Выбор количества звёзд
function selectStars(amount) {
    selectedStars = amount;
    document.getElementById('starsAmount').value = amount;
    updatePriceDisplay(amount);
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === amount) {
            btn.classList.add('active');
        }
    });
    
    tg.MainButton.show();
}

// Обновление отображения цены
function updatePriceDisplay(stars) {
    const price = starPrices[stars] || 0;
    document.getElementById('priceDisplay').textContent = 
        `${price.toLocaleString()} so'm`;
}

// Установка себя как получателя
function setSelf() {
    const user = tg.initDataUnsafe.user;
    if (user && user.username) {
        document.getElementById('username').value = user.username;
    } else {
        tg.showAlert("Username topilmadi. Iltimos, username kiriting.");
    }
}

// Покупка звёзд
function buyStars() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        tg.showAlert("Iltimos, username kiriting!");
        return;
    }
    
    const data = {
        stars: selectedStars,
        username: username,
        price: starPrices[selectedStars],
        timestamp: new Date().toISOString()
    };
    
    tg.sendData(JSON.stringify(data));
    
    tg.showPopup({
        title: 'Buyurtma',
        message: `⭐ ${selectedStars} stars\n💰 ${starPrices[selectedStars].toLocaleString()} so'm\n\nTo'lovga o'tish?`,
        buttons: [
            {
                id: 'confirm',
                type: 'ok',
                text: 'Ha, to\'lash'
            },
            {
                id: 'cancel',
                type: 'cancel'
            }
        ]
    }, (buttonId) => {
        if (buttonId === 'confirm') {
            tg.close();
        }
    });
}

// Переключение табов
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    tg.showAlert(`${tab} bo'limi tez orada qo'shiladi!`);
}

// Навигация
function navTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    tg.showAlert(`${page} bo'limi tez orada qo'shiladi!`);
}

// Добавление баланса
function addBalance() {
    tg.showAlert("Balance to'ldirish tez orada qo'shiladi!");
}

// Закрытие приложения
function closeApp() {
    tg.close();
}

// Готовность приложения
tg.ready();