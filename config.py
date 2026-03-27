import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')
ADMIN_ID = int(os.getenv('ADMIN_ID', 0))

# Цены на звёзды (в сумах)
STAR_PRICES = {
    50: 10000,
    75: 14000,
    100: 18000,
    250: 42000,
    500: 80000
}

# URL Mini App (будет заменён после деплоя на Vercel)
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://your-app.vercel.app')