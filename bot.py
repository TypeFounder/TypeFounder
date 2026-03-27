import asyncio
import logging
import json
import os
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

DATA_FILE = 'data.json'

def load_all_data():
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info(f"Loaded data: {data.get('admin_settings', {}).get('payment_details', 'No payment details')[:50]}...")
                return data
    except Exception as e:
        logger.error(f"Error loading data: {e}")
    return {'admins': []}

def save_all_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info("Data saved successfully")
    except Exception as e:
        logger.error(f"Error saving data: {e}")

async def is_admin(user_id):
    data = load_all_data()
    admins = data.get('admins', [])
    return user_id in admins

@dp.message(CommandStart())
async def cmd_start(message: Message):
    user = get_user(message.from_user.id)
    update_user(message.from_user.id, {'username': message.from_user.username or ''})
    
    builder = InlineKeyboardBuilder()
    builder.button(text="⭐ Открыть Uz Give", web_app=WebAppInfo(url=WEBAPP_URL))
    builder.button(text="💬 Поддержка", callback_data="support")
    
    if message.from_user.id == ADMIN_ID or await is_admin(message.from_user.id):
        builder.button(text="🔧 Админ панель", callback_data="admin_panel")
    
    builder.adjust(1)
    
    await message.answer(
        f"🎁 <b>Добро пожаловать в Uz Give!</b>\n\n"
        f"👤 <b>Ваш баланс:</b> {user['balance']:,} so'm\n\n"
        f"Покупайте Telegram Stars и подарки.",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "support")
async def support_handler(callback: types.CallbackQuery):
    await callback.message.answer(
        "💬 <b>Поддержка</b>\n\n"
        "По всем вопросам обращайтесь:\n"
        "<a href='https://t.me/stars_support_manager'>@stars_support_manager</a>",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Курс звёзд", callback_data="admin_star_rate")
    builder.button(text="🎁 Подарки", callback_data="admin_gifts")
    builder.button(text="💳 Реквизиты", callback_data="admin_payment")
    builder.button(text="⏳ Заявки", callback_data="admin_topups")
    builder.button(text="👥 Админы", callback_data="admin_manage")
    builder.button(text="📊 Статистика", callback_data="admin_stats")
    builder.adjust(1)
    
    await callback.message.edit_text(
        "🔧 <b>Админ панель</b>\n\nВыберите раздел:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "admin_manage")
async def admin_manage(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("❌ Только главный админ", show_alert=True)
        return
    
    data = load_all_data()
    admins = data.get('admins', [])
    
    text = "👥 <b>Управление админами</b>\n\n"
    text += f"Главный админ: @{(await bot.get_me()).username}\n\n"
    text += "<b>Админы:</b>\n"
    
    for admin_id in admins:
        try:
            user = await bot.get_chat(admin_id)
            username = user.username or user.first_name or "Unknown"
            text += f"• @{username} (ID: {admin_id})\n"
        except:
            text += f"• ID: {admin_id}\n"
    
    if not admins:
        text += "Нет админов\n"
    
    text += "\n<b>Чтобы добавить админа:</b>\n"
    text += "Отправьте ID пользователя\n"
    text += "Пример: <code>123456789</code>"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

@dp.callback_query(F.data == "admin_star_rate")
async def admin_star_rate(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    settings = get_admin_settings()
    rate = settings.get('star_rate', 200)
    
    text = f"💰 <b>Курс звёзд:</b>\n\n"
    text += f"1 звезда = {rate:,} so'm\n\n"
    text += f"<b>Примеры:</b>\n"
    text += f"50 звёзд = {50 * rate:,} so'm\n"
    text += f"100 звёзд = {100 * rate:,} so'm\n"
    text += f"500 звёзд = {500 * rate:,} so'm"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="✏️ Изменить курс", callback_data="admin_change_rate")
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")

@dp.callback_query(F.data == "admin_change_rate")
async def admin_change_rate(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    await callback.message.answer(
        "💰 <b>Изменение курса</b>\n\n"
        "Отправьте цену за 1 звезду (в сумах)\n\n"
        "Пример: <code>200</code>",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_gifts")
async def admin_gifts(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
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
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    settings = get_admin_settings()
    await callback.message.answer(
        "💳 <b>Текущие реквизиты:</b>\n\n"
        f"<code>{settings['payment_details']}</code>\n\n"
        "<b>Чтобы обновить:</b>\n"
        "Отправьте новые реквизиты сообщением",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_topups")
async def admin_topups(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
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
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
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
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
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
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
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
    is_admin_user = (message.from_user.id == ADMIN_ID or await is_admin(message.from_user.id))
    
    if not is_admin_user:
        return
    
    if message.text.startswith('/'):
        return
    
    try:
        logger.info(f"Admin message received: {message.text}")
        logger.info(f"From user: {message.from_user.id}, Admin ID: {ADMIN_ID}")
        
        # Проверяем, это ID админа (число больше 100000000)
        if message.text.isdigit() and int(message.text) > 100000000:
            admin_id = int(message.text)
            data = load_all_data()
            
            if 'admins' not in data:
                data['admins'] = []
            
            if admin_id not in data['admins']:
                data['admins'].append(admin_id)
                save_all_data(data)
                logger.info(f"Admin added: {admin_id}")
                await message.answer(f"✅ Админ добавлен: ID {admin_id}")
            else:
                await message.answer(f"⚠️ Этот пользователь уже админ")
            return
        
        # Проверяем, это число (курс звёзд)
        if message.text.isdigit():
            rate = int(message.text)
            settings = get_admin_settings()
            settings['star_rate'] = rate
            update_admin_settings({'star_rate': rate})
            await message.answer(f"✅ Курс обновлён: 1 звезда = {rate:,} so'm")
        else:
            # Это реквизиты - обновляем напрямую
            logger.info(f"Updating payment details to: {message.text}")
            data = load_all_data()
            data['admin_settings']['payment_details'] = message.text
            save_all_data(data)
            logger.info(f"Payment details saved: {data['admin_settings']['payment_details']}")
            await message.answer("✅ Реквизиты обновлены!")
            
            # Проверяем что сохранилось
            check_data = load_all_data()
            logger.info(f"Verification - Payment details: {check_data['admin_settings']['payment_details']}")
    except Exception as e:
        logger.error(f"Error in handle_text: {e}")
        await message.answer(f"❌ Ошибка: {e}")

@dp.message(F.web_app_data)
async def process_webapp_data(message: Message):
    try:
        data = json.loads(message.web_app_data.data)
        logger.info(f"WebApp data received: {data}")
        
        if data.get('type') == 'get_payment_details':
            settings = get_admin_settings()
            payment_details = settings.get('payment_details', 'Not set')
            logger.info(f"Sending payment details: {payment_details}")
            await message.answer(payment_details)
            return
        
        if data.get('type') == 'topup_request':
            username = data.get('username', 'Не указан')
            amount = data.get('amount', 0)
            proof = data.get('proof', 'Не предоставлен')
            
            logger.info(f"Creating topup request: user={message.from_user.id}, amount={amount}, username={username}, proof={proof}")
            
            request = create_topup_request(message.from_user.id, amount, proof, username)
            
            logger.info(f"Topup request created: {request}")
            
            settings = get_admin_settings()
            
            # Получаем список всех админов
            admin_list = [ADMIN_ID]
            data_file = 'data.json'
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    data_json = json.load(f)
                    admin_list.extend(data_json.get('admins', []))
            
            logger.info(f"Sending to admins: {admin_list}")
            
            # Отправляем всем админам
            for admin_id in set(admin_list):
                try:
                    await bot.send_message(
                        admin_id,
                        f"💰 <b>НОВАЯ ЗАЯВКА # {request['id']}</b>\n\n"
                        f"👤 <b>Пользователь:</b> @{username}\n"
                        f"🔢 <b>ID:</b> <code>{message.from_user.id}</code>\n"
                        f"💵 <b>Сумма:</b> {amount:,} so'm\n"
                        f"📄 <b>Чек:</b> {proof}\n"
                        f"⏰ <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
                        f"Реквизиты:\n{settings.get('payment_details', 'Not set')}",
                        parse_mode="HTML"
                    )
                    logger.info(f"Topup request sent to admin {admin_id}")
                except Exception as e:
                    logger.error(f"Failed to send to admin {admin_id}: {e}")
            
            await message.answer(
                f"✅ <b>Заявка отправлена!</b>\n\n"
                f"💵 Сумма: {amount:,} so'm\n"
                f"👤 Username: @{username}\n"
                f"📄 Чек: {proof}\n\n"
                f"Ожидайте подтверждения админа.",
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
    except Exception as e:
        logger.error(f"Error in process_webapp_data: {e}")

async def main():
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())