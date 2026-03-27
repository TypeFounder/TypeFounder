ёimport asyncio
import logging
import json
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    WebAppInfo, 
    LabeledPrice, 
    PreCheckoutQuery,
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton
)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import BOT_TOKEN, ADMIN_ID
from database import (
    get_user, update_user, add_balance, deduct_balance,
    create_topup_request, get_pending_topups, approve_topup, reject_topup,
    add_purchase, get_user_purchases, get_top_users,
    get_admin_settings, update_admin_settings
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Команда /start
@dp.message(CommandStart())
async def cmd_start(message: Message):
    user = get_user(message.from_user.id)
    update_user(message.from_user.id, {'username': message.from_user.username or ''})
    
    builder = InlineKeyboardBuilder()
    builder.button(
        text="⭐ Открыть Uz Give",
        web_app=WebAppInfo(url="https://type-founder.vercel.app")
    )
    
    if message.from_user.id == ADMIN_ID or str(message.from_user.id) == str(ADMIN_ID):
        builder.button(text="🔧 Админ панель", callback_data="admin_panel")
    
    builder.adjust(1)
    
    await message.answer(
        f"🎁 <b>Добро пожаловать в Uz Give!</b>\n\n"
        f"👤 <b>Ваш баланс:</b> {user['balance']:,} so'm\n\n"
        f"Покупайте Telegram Stars и подарки быстро и удобно.\n\n"
        f"Нажмите кнопку ниже:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

# Админ панель
@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Настроить цены звёзд", callback_data="admin_stars")
    builder.button(text="🎁 Настроить подарки", callback_data="admin_gifts")
    builder.button(text="💳 Реквизиты оплаты", callback_data="admin_payment")
    builder.button(text="⏳ Заявки на пополнение", callback_data="admin_topups")
    builder.button(text="📊 Статистика", callback_data="admin_stats")
    builder.adjust(1)
    
    await callback.message.edit_text(
        "🔧 <b>Админ панель</b>\n\n"
        "Выберите раздел:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

# Настройка цен звёзд
@dp.callback_query(F.data == "admin_stars")
async def admin_stars(callback: types.CallbackQuery):
    settings = get_admin_settings()
    prices = settings['star_prices']
    
    text = "💰 <b>Цены на звёзды:</b>\n\n"
    for stars, price in sorted(prices.items()):
        text += f"⭐ {stars} stars - {price:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="✏️ Изменить цену", callback_data="admin_change_price")
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

# Изменение цены
@dp.callback_query(F.data == "admin_change_price")
async def admin_change_price(callback: types.CallbackQuery):
    await callback.message.answer(
        "💰 <b>Изменение цены</b>\n\n"
        "Отправьте сообщение в формате:\n"
        "<code>количество_звёзд цена</code>\n\n"
        "Пример: <code>50 12000</code>",
        parse_mode="HTML"
    )
    await callback.answer()

# Обработка новой цены
@dp.message(F.text)
async def process_new_price(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    
    try:
        parts = message.text.split()
        if len(parts) == 2:
            stars = int(parts[0])
            price = int(parts[1])
            
            settings = get_admin_settings()
            settings['star_prices'][stars] = price
            update_admin_settings({'star_prices': settings['star_prices']})
            
            await message.answer(f"✅ Цена обновлена: {stars} stars = {price:,} so'm")
    except:
        pass

# Настройка подарков
@dp.callback_query(F.data == "admin_gifts")
async def admin_gifts(callback: types.CallbackQuery):
    settings = get_admin_settings()
    gifts = settings['gifts']
    
    text = "🎁 <b>Подарки:</b>\n\n"
    for gift in gifts:
        text += f"{gift['emoji']} {gift['name']} - {gift['stars']}⭐ - {gift['price']:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="➕ Добавить подарок", callback_data="admin_add_gift")
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

# Реквизиты оплаты
@dp.callback_query(F.data == "admin_payment")
async def admin_payment(callback: types.CallbackQuery):
    settings = get_admin_settings()
    
    await callback.message.answer(
        "💳 <b>Реквизиты для оплаты</b>\n\n"
        "Отправьте текст с реквизитами:\n"
        "Номер карты, телефон и т.д.\n\n"
        f"Текущие:\n{settings['payment_details']}",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.message(F.text)
async def process_payment_details(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    
    update_admin_settings({'payment_details': message.text})
    await message.answer("✅ Реквизиты обновлены!")

# Заявки на пополнение
@dp.callback_query(F.data == "admin_topups")
async def admin_topups(callback: types.CallbackQuery):
    topups = get_pending_topups()
    
    if not topups:
        builder = InlineKeyboardBuilder()
        builder.button(text="🔙 Назад", callback_data="admin_panel")
        await callback.message.edit_text(
            "⏳ <b>Нет pending заявок</b>",
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
        return
    
    for topup in topups[:5]:
        builder = InlineKeyboardBuilder()
        builder.button(text="✅ Зачислить", callback_data=f"approve_{topup['id']}")
        builder.button(text="❌ Отклонить", callback_data=f"reject_{topup['id']}")
        builder.adjust(2)
        
        await callback.message.answer(
            f"💰 <b>Заявка #{topup['id']}</b>\n\n"
            f"👤 Пользователь: @{topup['username']}\n"
            f"💵 Сумма: {topup['amount']:,} so'm\n"
            f"📄 Чек: {topup['payment_proof']}",
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
    
    await callback.answer()

# Одобрение заявки
@dp.callback_query(F.data.startswith("approve_"))
async def approve_topup_handler(callback: types.CallbackQuery):
    request_id = int(callback.data.split("_")[1])
    request = approve_topup(request_id)
    
    if request:
        await bot.send_message(
            request['user_id'],
            f"✅ <b>Пополнение зачислено!</b>\n\n"
            f"💵 Сумма: {request['amount']:,} so'm\n"
            f"Ваш баланс пополнен.",
            parse_mode="HTML"
        )
        await callback.message.edit_text(f"✅ Зачислено {request['amount']:,} so'm пользователю @{request['username']}")
    
    await callback.answer()

# Отклонение заявки
@dp.callback_query(F.data.startswith("reject_"))
async def reject_topup_handler(callback: types.CallbackQuery):
    request_id = int(callback.data.split("_")[1])
    request = reject_topup(request_id)
    
    if request:
        await bot.send_message(
            request['user_id'],
            f"❌ <b>Пополнение отклонено</b>\n\n"
            f"💵 Сумма: {request['amount']:,} so'm\n"
            f"Проверьте правильность оплаты и попробуйте снова.",
            parse_mode="HTML"
        )
        await callback.message.edit_text(f"❌ Отклонено для @{request['username']}")
    
    await callback.answer()

# Статистика
@dp.callback_query(F.data == "admin_stats")
async def admin_stats(callback: types.CallbackQuery):
    top_users = get_top_users(5)
    
    text = "📊 <b>Статистика</b>\n\n"
    text += "<b>Топ пользователей:</b>\n"
    for i, user in enumerate(top_users, 1):
        text += f"{i}. @{user['username'] or 'Unknown'} - {user['total_spent']:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

# Обработка данных из Mini App
@dp.message(F.web_app_data)
async def process_webapp_data(message: Message):
    data = json.loads(message.web_app_data.data)
    
    if data.get('type') == 'topup':
        amount = data.get('amount')
        payment_proof = data.get('payment_proof')
        
        request = create_topup_request(message.from_user.id, amount, payment_proof)
        
        settings = get_admin_settings()
        await bot.send_message(
            ADMIN_ID,
            f"💰 <b>Новая заявка на пополнение #{request['id']}</b>\n\n"
            f"👤 Пользователь: @{message.from_user.username}\n"
            f"💵 Сумма: {amount:,} so'm\n"
            f"📄 Чек: {payment_proof}\n\n"
            f"Реквизиты:\n{settings['payment_details']}",
            parse_mode="HTML"
        )
        
        await message.answer(
            f"✅ <b>Заявка принята!</b>\n\n"
            f"💵 Сумма: {amount:,} so'm\n"
            f"Ожидайте подтверждения от админа.",
            parse_mode="HTML"
        )
    
    elif data.get('type') == 'stars':
        stars = data.get('stars')
        price = data.get('price')
        username = data.get('username')
        
        if deduct_balance(message.from_user.id, price):
            add_purchase(message.from_user.id, 'stars', stars, price, username)
            await message.answer(
                f"✅ <b>Куплено {stars} звёзд!</b>\n\n"
                f"💰 Списано: {price:,} so'm",
                parse_mode="HTML"
            )
        else:
            await message.answer(
                "❌ <b>Недостаточно средств</b>\n\n"
                "Пополните баланс и попробуйте снова.",
                parse_mode="HTML"
            )
    
    elif data.get('type') == 'gift':
        gift_name = data.get('gift')
        stars = data.get('stars')
        price = data.get('price')
        
        if deduct_balance(message.from_user.id, price):
            add_purchase(message.from_user.id, 'gift', stars, price, gift_name)
            await message.answer(
                f"✅ <b>Куплен подарок {gift_name}!</b>\n\n"
                f"💰 Списано: {price:,} so'm",
                parse_mode="HTML"
            )
        else:
            await message.answer(
                "❌ <b>Недостаточно средств</b>\n\n"
                "Пополните баланс и попробуйте снова.",
                parse_mode="HTML"
            )

# Запуск бота
async def main():
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())