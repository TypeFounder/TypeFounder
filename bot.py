import asyncio
import logging
import json
from datetime import datetime
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.types import WebAppInfo, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import BOT_TOKEN, ADMIN_ID, WEBAPP_URL
from database import (
    get_user, update_user, deduct_balance, add_balance,
    create_topup_request, get_pending_topups, approve_topup, reject_topup,
    add_purchase, get_top_users, get_admin_settings, update_admin_settings
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: Message):
    user = get_user(message.from_user.id)
    update_user(message.from_user.id, {'username': message.from_user.username or ''})
    
    builder = InlineKeyboardBuilder()
    builder.button(
        text="⭐ Открыть Uz Give",
        web_app=WebAppInfo(url=WEBAPP_URL)
    )
    
    if message.from_user.id == ADMIN_ID:
        builder.button(text="🔧 Админ панель", callback_data="admin_panel")
    
    builder.adjust(1)
    
    await message.answer(
        f"🎁 <b>Добро пожаловать в Uz Give!</b>\n\n"
        f"👤 <b>Ваш баланс:</b> {user['balance']:,} so'm\n\n"
        f"Покупайте Telegram Stars и подарки.",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Цены на звёзды", callback_data="admin_stars")
    builder.button(text="🎁 Подарки", callback_data="admin_gifts")
    builder.button(text="💳 Реквизиты", callback_data="admin_payment")
    builder.button(text="⏳ Заявки", callback_data="admin_topups")
    builder.button(text="📊 Статистика", callback_data="admin_stats")
    builder.adjust(1)
    
    await callback.message.edit_text(
        "🔧 <b>Админ панель</b>\n\nВыберите раздел:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "admin_stars")
async def admin_stars(callback: types.CallbackQuery):
    settings = get_admin_settings()
    text = "💰 <b>Цены на звёзды:</b>\n\n"
    for stars, price in sorted(settings['star_prices'].items()):
        text += f"⭐ {stars} stars - {price:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="✏️ Изменить", callback_data="admin_change_price")
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

@dp.callback_query(F.data == "admin_change_price")
async def admin_change_price(callback: types.CallbackQuery):
    await callback.message.answer(
        "💰 <b>Изменение цены</b>\n\n"
        "Отправьте: <code>количество цена</code>\n"
        "Пример: <code>50 12000</code>",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_gifts")
async def admin_gifts(callback: types.CallbackQuery):
    settings = get_admin_settings()
    text = "🎁 <b>Подарки:</b>\n\n"
    for gift in settings['gifts']:
        text += f"{gift['emoji']} {gift['name']} - {gift['stars']}⭐ - {gift['price']:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

@dp.callback_query(F.data == "admin_payment")
async def admin_payment(callback: types.CallbackQuery):
    settings = get_admin_settings()
    await callback.message.answer(
        "💳 <b>Реквизиты:</b>\n\n"
        f"<code>{settings['payment_details']}</code>\n\n"
        "Отправьте новые реквизиты:",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_topups")
async def admin_topups(callback: types.CallbackQuery):
    topups = get_pending_topups()
    
    if not topups:
        builder = InlineKeyboardBuilder()
        builder.button(text="🔙 Назад", callback_data="admin_panel")
        await callback.message.edit_text(
            "⏳ <b>Нет заявок</b>",
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
        return
    
    await callback.message.answer(f"📋 <b>Заявок: {len(topups)}</b>", parse_mode="HTML")
    
    for topup in topups[:10]:
        builder = InlineKeyboardBuilder()
        builder.button(text="✅ Зачислить", callback_data=f"approve_{topup['id']}")
        builder.button(text="❌ Отклонить", callback_data=f"reject_{topup['id']}")
        builder.adjust(2)
        
        await bot.send_message(
            callback.from_user.id,
            f"💰 <b>Заявка #{topup['id']}</b>\n\n"
            f"👤 @{topup['username']}\n"
            f"💵 {topup['amount']:,} so'm\n"
            f"📄 {topup['payment_proof']}",
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
    
    await callback.answer()

@dp.callback_query(F.data.startswith("approve_"))
async def approve_handler(callback: types.CallbackQuery):
    request_id = int(callback.data.split("_")[1])
    request = approve_topup(request_id)
    
    if request:
        await bot.send_message(
            request['user_id'],
            f"✅ <b>Пополнение зачислено!</b>\n\n"
            f"💵 {request['amount']:,} so'm",
            parse_mode="HTML"
        )
        await callback.message.edit_text(f"✅ Зачислено @{request['username']}")
    await callback.answer()

@dp.callback_query(F.data.startswith("reject_"))
async def reject_handler(callback: types.CallbackQuery):
    request_id = int(callback.data.split("_")[1])
    request = reject_topup(request_id)
    
    if request:
        await bot.send_message(
            request['user_id'],
            f"❌ <b>Отклонено</b>\n\n💵 {request['amount']:,} so'm",
            parse_mode="HTML"
        )
        await callback.message.edit_text(f"❌ Отклонено @{request['username']}")
    await callback.answer()

@dp.callback_query(F.data == "admin_stats")
async def admin_stats(callback: types.CallbackQuery):
    top_users = get_top_users(5)
    text = "📊 <b>Топ пользователей:</b>\n\n"
    for i, user in enumerate(top_users, 1):
        text += f"{i}. @{user['username'] or 'Unknown'} - {user['total_spent']:,} so'm\n"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

@dp.message(F.text)
async def handle_text(message: Message):
    if message.from_user.id != ADMIN_ID:
        return
    
    if message.text.startswith('/'):
        return
    
    try:
        parts = message.text.split()
        if len(parts) == 2:
            stars = int(parts[0])
            price = int(parts[1])
            settings = get_admin_settings()
            settings['star_prices'][stars] = price
            update_admin_settings({'star_prices': settings['star_prices']})
            await message.answer(f"✅ {stars} stars = {price:,} so'm")
        else:
            update_admin_settings({'payment_details': message.text})
            await message.answer("✅ Реквизиты обновлены!")
    except:
        pass

@dp.message(F.web_app_data)
async def process_webapp_data(message: Message):
    data = json.loads(message.web_app_data.data)
    
    if data.get('type') == 'get_payment_details':
        settings = get_admin_settings()
        await message.answer(settings['payment_details'])
        return
    
    if data.get('type') == 'topup_request':
        request = create_topup_request(
            message.from_user.id,
            data.get('amount'),
            data.get('proof', 'Не предоставлен'),
            data.get('username', 'Не указан')
        )
        
        settings = get_admin_settings()
        
        await bot.send_message(
            ADMIN_ID,
            f"💰 <b>НОВАЯ ЗАЯВКА # {request['id']}</b>\n\n"
            f"👤 <b>Пользователь:</b> @{data.get('username', 'Не указан')}\n"
            f"🔢 <b>ID:</b> <code>{message.from_user.id}</code>\n"
            f"💵 <b>Сумма:</b> {data['amount']:,} so'm\n"
            f"📄 <b>Чек/транзакция:</b> {data.get('proof', 'Нет')}\n"
            f"⏰ <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
            f"Реквизиты админа:\n{settings['payment_details']}\n\n"
            f"Выберите действие:",
            parse_mode="HTML"
        )
        
        await message.answer(
            f"✅ <b>Заявка отправлена!</b>\n\n"
            f"💵 Сумма: {data['amount']:,} so'm\n"
            f"👤 Username: @{data.get('username', 'Не указан')}\n"
            f"📄 Чек: {data.get('proof', 'Нет')}\n\n"
            f"Ожидайте подтверждения админа.\n"
            f"После одобрения баланс пополнится автоматически.",
            parse_mode="HTML"
        )
        return
    
    if data.get('type') == 'stars':
        if deduct_balance(message.from_user.id, data['price']):
            add_purchase(message.from_user.id, 'stars', data['stars'], data['price'])
            await message.answer(f"✅ Куплено {data['stars']} звёзд!\n💰 {data['price']:,} so'm")
        else:
            await message.answer("❌ Недостаточно средств\nПополните баланс")
    
    elif data.get('type') == 'gift':
        if deduct_balance(message.from_user.id, data['price']):
            add_purchase(message.from_user.id, 'gift', data['stars'], data['price'], data['gift'])
            await message.answer(f"✅ Подарок {data['gift']}!\n💰 {data['price']:,} so'm")
        else:
            await message.answer("❌ Недостаточно средств")

async def main():
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())