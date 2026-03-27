import asyncio
import logging
import json
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command
from aiogram.types import (
    WebAppInfo, 
    LabeledPrice, 
    PreCheckoutQuery,
    Message
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import BOT_TOKEN, STAR_PRICES, WEBAPP_URL

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Команда /start
@dp.message(Command("start"))
async def cmd_start(message: Message):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="⭐ Открыть Uz Give",
        web_app=WebAppInfo(url=WEBAPP_URL)
    )
    builder.button(text="💎 Купить звёзды", callback_data="buy_stars")
    builder.adjust(1)
    
    await message.answer(
        "🎁 <b>Добро пожаловать в Uz Give!</b>\n\n"
        "Покупайте Telegram Stars быстро и удобно.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

# Кнопка покупки звёзд
@dp.callback_query(F.data == "buy_stars")
async def process_buy_stars(callback: types.CallbackQuery):
    builder = InlineKeyboardBuilder()
    
    for stars, price in STAR_PRICES.items():
        builder.button(
            text=f"⭐ {stars} stars - {price:,} so'm",
            callback_data=f"pay_{stars}"
        )
    
    builder.adjust(1)
    builder.button(text="🔙 Назад", callback_data="back")
    builder.adjust(1)
    
    await callback.message.edit_text(
        "💫 <b>Выберите количество звёзд:</b>",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

# Обработка выбора звёзд для оплаты
@dp.callback_query(F.data.startswith("pay_"))
async def process_payment(callback: types.CallbackQuery):
    stars = int(callback.data.split("_")[1])
    price = STAR_PRICES.get(stars, 0)
    
    if price == 0:
        await callback.answer("❌ Неверная сумма", show_alert=True)
        return
    
    prices = [LabeledPrice(label=f"{stars} Telegram Stars", amount=price)]
    
    builder = InlineKeyboardBuilder()
    builder.button(text="💳 Оплатить", pay=True)
    builder.button(text="🔙 Назад", callback_data="buy_stars")
    builder.adjust(1)
    
    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=f"Telegram Stars - {stars} ⭐",
        description=f"Покупка {stars} Telegram Stars",
        payload=f"stars_{stars}_{callback.from_user.id}",
        provider_token="",  # Пустой для Telegram Stars
        currency="UZS",
        prices=prices,
        start_parameter="stars_purchase",
        need_name=False,
        need_phone_number=False,
        need_email=False,
        need_shipping_address=False,
        reply_markup=builder.as_markup()
    )
    
    await callback.answer()

# Pre-checkout query
@dp.pre_checkout_query()
async def process_pre_checkout(query: PreCheckoutQuery):
    await bot.answer_pre_checkout_query(query.id, ok=True)

# Успешная оплата
@dp.message(F.successful_payment)
async def process_successful_payment(message: Message):
    payment_info = message.successful_payment
    payload = payment_info.invoice_payload
    
    parts = payload.split("_")
    stars = parts[1] if len(parts) > 1 else "0"
    
    await message.answer(
        f"✅ <b>Оплата прошла успешно!</b>\n\n"
        f"⭐ Звёзды: {stars}\n"
        f"💰 Сумма: {payment_info.total_amount:,} so'm\n\n"
        f"Звёзды будут зачислены в течение 5 минут.",
        parse_mode="HTML"
    )

# Кнопка назад
@dp.callback_query(F.data == "back")
async def process_back(callback: types.CallbackQuery):
    await cmd_start(callback.message)

# Обработка данных из Mini App
@dp.message(F.web_app_data)
async def process_webapp_data(message: Message):
    data = message.web_app_data.data
    logger.info(f"WebApp data: {data}")
    
    try:
        data_dict = json.loads(data)
        stars = data_dict.get("stars")
        username = data_dict.get("username")
        
        if stars and stars in STAR_PRICES:
            price = STAR_PRICES[stars]
            await message.answer(
                f"📝 <b>Заявка на покупку:</b>\n\n"
                f"⭐ Звёзды: {stars}\n"
                f"👤 Username: @{username or 'Не указан'}\n"
                f"💰 Сумма: {price:,} so'm",
                parse_mode="HTML"
            )
    except Exception as e:
        logger.error(f"Error parsing webapp data: {e}")

# Запуск бота
async def main():
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())