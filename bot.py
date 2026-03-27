import asyncio
import logging
import json
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.types import WebAppInfo, Message, FSInputFile
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

DATA_FILE = 'data.json'

def load_all_data():
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading  {e}")
    return {'admins': []}

def save_all_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving  {e}")

async def is_admin(user_id):
    data = load_all_data()
    admins = data.get('admins', [])
    return user_id in admins

@dp.message(CommandStart())
async def cmd_start(message: Message):
    user = get_user(message.from_user.id)
    update_user(message.from_user.id, {'username': message.from_user.username or ''})
    
    image_url = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="⭐ Открыть Uz Give", web_app=WebAppInfo(url=WEBAPP_URL))
    builder.button(text="💰 Пополнить баланс", callback_data="topup_balance")
    builder.button(text="💬 Поддержка", callback_data="support")
    
    if message.from_user.id == ADMIN_ID or await is_admin(message.from_user.id):
        builder.button(text="🔧 Админ панель", callback_data="admin_panel")
    
    builder.adjust(1)
    
    await message.answer_photo(
        photo=image_url,
        caption=(
            f"🎁 <b>Добро пожаловать в Uz Give!</b>\n\n"
            f"👤 <b>Ваш баланс:</b> {user['balance']:,} so'm\n\n"
            f"Покупайте Telegram Stars, Premium и подарки."
        ),
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

@dp.callback_query(F.data == "topup_balance")
async def topup_balance_handler(callback: types.CallbackQuery):
    settings = get_admin_settings()
    payment_details = settings.get('payment_details', 'Реквизиты не настроены')
    
    await callback.message.answer(
        f"💰 <b>Пополнение баланса</b>\n\n"
        f"<b>Реквизиты для оплаты:</b>\n"
        f"<code>{payment_details}</code>\n\n"
        f"<b>Инструкция:</b>\n"
        f"1️⃣ Переведите нужную сумму\n"
        f"2️⃣ Нажмите кнопку ниже\n"
        f"3️⃣ Отправьте чек (фото/скриншот)\n\n"
        f"После подтверждения админом баланс пополнится!",
        parse_mode="HTML",
        reply_markup=InlineKeyboardBuilder().button(
            text="📸 Отправить чек",
            callback_data="send_payment_proof"
        ).adjust(1).as_markup()
    )
    await callback.answer()

@dp.callback_query(F.data == "send_payment_proof")
async def send_payment_proof_handler(callback: types.CallbackQuery):
    await callback.message.answer(
        "📸 <b>Отправка чека</b>\n\n"
        "Отправьте <b>фото/скриншот</b> чека об оплате этим сообщением.\n\n"
        "<i>Просто отправьте фото, бот автоматически привяжет его к вашей заявке</i>",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.message(F.photo)
async def handle_payment_proof(message: Message):
    """Обработка загруженных чеков"""
    logger.info(f"📸 Получено фото от пользователя {message.from_user.id}")
    
    try:
        photo = message.photo[-1]
        user = get_user(message.from_user.id)
        username = message.from_user.username or 'Не указан'
        
        # Загружаем данные
        data = load_all_data()
        
        # Создаём заявку на пополнение
        request_id = len(data.get('topup_requests', [])) + 1
        
        request = {
            'id': request_id,
            'user_id': message.from_user.id,
            'username': username,
            'amount': 0,  # Будет указано админом
            'payment_proof': 'Фото загружено',
            'proof_photo_id': photo.file_id,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        if 'topup_requests' not in data:
            data['topup_requests'] = []
        
        data['topup_requests'].append(request)
        save_all_data(data)
        
        await message.answer(
            f"✅ <b>Чек получен!</b>\n\n"
            f"Заявка #{request_id} создана.\n"
            f"Ожидайте подтверждения админа.\n\n"
            f"После одобрения баланс пополнится на указанную сумму.",
            parse_mode="HTML"
        )
        
        # Отправляем чек ВСЕМ админам
        admin_list = [ADMIN_ID]
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data_json = json.load(f)
                admin_list.extend(data_json.get('admins', []))
        
        for admin_id in set(admin_list):
            try:
                await bot.send_photo(
                    admin_id,
                    photo=photo.file_id,
                    caption=(
                        f"💰 <b>🔔 НОВАЯ ЗАЯВКА # {request_id}</b>\n\n"
                        f"👤 <b>Пользователь:</b> @{username}\n"
                        f"🔢 <b>ID:</b> <code>{message.from_user.id}</code>\n"
                        f"💵 <b>Сумма:</b> <i>(укажите в ответе)</i>\n"
                        f"📄 <b>Чек:</b> Фото загружено\n"
                        f"⏰ <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
                        f"<b>Для одобрения:</b>\n"
                        f"Отправьте: <code>/approve {request_id} сумма</code>\n"
                        f"Пример: <code>/approve {request_id} 10000</code>\n\n"
                        f"<b>Для отклонения:</b>\n"
                        f"<code>/reject {request_id}</code>"
                    ),
                    parse_mode="HTML"
                )
                logger.info(f"✅ Чек отправлен админу {admin_id}")
            except Exception as e:
                logger.error(f"❌ Не удалось отправить чек админу {admin_id}: {e}")
        
    except Exception as e:
        logger.error(f"❌ Error in handle_payment_proof: {e}")
        await message.answer("❌ Произошла ошибка. Попробуйте ещё раз.")

@dp.message(F.text.startswith('/approve'))
async def approve_handler(message: Message):
    """Одобрение заявки админом"""
    if message.from_user.id != ADMIN_ID and not await is_admin(message.from_user.id):
        return
    
    try:
        parts = message.text.split()
        if len(parts) != 3:
            await message.answer("❌ Формат: /approve ID СУММА\nПример: /approve 1 10000")
            return
        
        request_id = int(parts[1])
        amount = int(parts[2])
        
        data = load_all_data()
        
        # Ищем заявку
        request = None
        for req in data.get('topup_requests', []):
            if req['id'] == request_id:
                request = req
                break
        
        if not request:
            await message.answer(f"❌ Заявка #{request_id} не найдена")
            return
        
        # Обновляем статус
        for req in data['topup_requests']:
            if req['id'] == request_id:
                req['status'] = 'approved'
                req['amount'] = amount
                req['approved_at'] = datetime.now().isoformat()
                break
        
        # Зачисляем баланс
        add_balance(request['user_id'], amount)
        save_all_data(data)
        
        await message.answer(
            f"✅ <b>Заявка #{request_id} одобрена!</b>\n\n"
            f"💵 Сумма: {amount:,} so'm зачислена\n"
            f"👤 @{request['username']}"
        )
        
        # Отправляем пользователю красивую картинку
        success_image = "https://i.imgur.com/success-check.png"  # Замените на свою картинку
        
        try:
            await bot.send_photo(
                request['user_id'],
                photo=success_image,
                caption=(
                    f"✅ <b>Пополнение успешно!</b>\n\n"
                    f"💰 <b>Сумма:</b> {amount:,} so'm\n"
                    f"📊 <b>Ваш баланс:</b> {get_user(request['user_id'])['balance']:,} so'm\n\n"
                    f"Спасибо за использование Uz Give! 🎁"
                ),
                parse_mode="HTML"
            )
        except:
            await bot.send_message(
                request['user_id'],
                f"✅ <b>Пополнение успешно!</b>\n\n"
                f"💰 <b>Сумма:</b> {amount:,} so'm\n"
                f"📊 <b>Ваш баланс:</b> {get_user(request['user_id'])['balance']:,} so'm",
                parse_mode="HTML"
            )
        
    except Exception as e:
        logger.error(f"Error in approve_handler: {e}")
        await message.answer(f"❌ Ошибка: {e}")

@dp.message(F.text.startswith('/reject'))
async def reject_handler(message: Message):
    """Отклонение заявки админом"""
    if message.from_user.id != ADMIN_ID and not await is_admin(message.from_user.id):
        return
    
    try:
        parts = message.text.split()
        if len(parts) != 2:
            await message.answer("❌ Формат: /reject ID\nПример: /reject 1")
            return
        
        request_id = int(parts[1])
        
        data = load_all_data()
        
        # Ищем заявку
        request = None
        for req in data.get('topup_requests', []):
            if req['id'] == request_id:
                request = req
                break
        
        if not request:
            await message.answer(f"❌ Заявка #{request_id} не найдена")
            return
        
        # Обновляем статус
        for req in data['topup_requests']:
            if req['id'] == request_id:
                req['status'] = 'rejected'
                break
        
        save_all_data(data)
        
        await message.answer(f"❌ Заявка #{request_id} отклонена")
        
        await bot.send_message(
            request['user_id'],
            f"❌ <b>Заявка отклонена</b>\n\n"
            f"Заявка #{request_id} на пополнение была отклонена.\n\n"
            f"Если вы считаете это ошибкой - обратитесь в поддержку.",
            parse_mode="HTML"
        )
        
    except Exception as e:
        logger.error(f"Error in reject_handler: {e}")
        await message.answer(f"❌ Ошибка: {e}")

@dp.callback_query(F.data == "admin_panel")
async def admin_panel(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Курс звёзд", callback_data="admin_star_rate")
    builder.button(text="💎 Telegram Premium", callback_data="admin_premium")
    builder.button(text="🎁 Подарки", callback_data="admin_gifts")
    builder.button(text="💳 Реквизиты", callback_data="admin_payment")
    builder.button(text="⏳ Заявки", callback_data="admin_topups")
    builder.button(text="👥 Админы", callback_data="admin_manage")
    builder.button(text="📊 Статистика", callback_data="admin_stats")
    builder.adjust(1)
    
    await callback.message.answer(
        "🔧 <b>Админ панель</b>\n\nВыберите раздел:",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data == "admin_premium")
async def admin_premium(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    settings = get_admin_settings()
    premium_price = settings.get('premium_price', 50000)
    
    text = f"💎 <b>Telegram Premium:</b>\n\n"
    text += f"Цена: {premium_price:,} so'm\n\n"
    text += f"<b>Чтобы изменить:</b>\n"
    text += f"Отправьте новую цену числом\n"
    text += f"Пример: <code>45000</code>"
    
    builder = InlineKeyboardBuilder()
    builder.button(text="🔙 Назад", callback_data="admin_panel")
    builder.adjust(1)
    
    await callback.message.answer(
        text,
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

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
    
    await callback.message.answer(
        text,
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

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
    
    await callback.message.answer(
        text,
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

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
    
    await callback.message.answer(
        text,
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

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
    
    data = load_all_data()
    topups = data.get('topup_requests', [])
    pending = [t for t in topups if t['status'] == 'pending']
    
    if not pending:
        builder = InlineKeyboardBuilder()
        builder.button(text="🔙 Назад", callback_data="admin_panel")
        await callback.message.answer(
            "⏳ <b>Нет заявок</b>",
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
        await callback.answer()
        return
    
    await callback.message.answer(f"📋 <b>Заявок: {len(pending)}</b>", parse_mode="HTML")
    
    for topup in pending[:10]:
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
async def approve_callback(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    request_id = int(callback.data.split("_")[1])
    await callback.message.answer(
        f"💰 <b>Одобрение заявки #{request_id}</b>\n\n"
        f"Отправьте сумму для зачисления:\n"
        f"Пример: <code>10000</code>",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("reject_"))
async def reject_callback(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID and not await is_admin(callback.from_user.id):
        await callback.answer("❌ Доступ запрещён", show_alert=True)
        return
    
    request_id = int(callback.data.split("_")[1])
    data = load_all_data()
    
    for req in data['topup_requests']:
        if req['id'] == request_id:
            req['status'] = 'rejected'
            break
    
    save_all_data(data)
    
    await callback.message.answer(f"❌ Заявка #{request_id} отклонена")
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
    
    await callback.message.answer(
        text,
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )
    await callback.answer()

@dp.message(F.text)
async def handle_text(message: Message):
    is_admin_user = (message.from_user.id == ADMIN_ID or await is_admin(message.from_user.id))
    
    if not is_admin_user:
        return
    
    if message.text.startswith('/'):
        return
    
    try:
        if message.text.isdigit() and int(message.text) > 100000000:
            admin_id = int(message.text)
            data = load_all_data()
            
            if 'admins' not in 
                data['admins'] = []
            
            if admin_id not in data['admins']:
                data['admins'].append(admin_id)
                save_all_data(data)
                await message.answer(f"✅ Админ добавлен: ID {admin_id}")
            else:
                await message.answer(f"⚠️ Этот пользователь уже админ")
            return
        
        if message.text.isdigit():
            value = int(message.text)
            settings = get_admin_settings()
            
            if value > 10000:
                settings['premium_price'] = value
                update_admin_settings({'premium_price': value})
                await message.answer(f"✅ Premium обновлён: {value:,} so'm")
            else:
                settings['star_rate'] = value
                update_admin_settings({'star_rate': value})
                await message.answer(f"✅ Курс обновлён: 1 звезда = {value:,} so'm")
        else:
            data = load_all_data()
            data['admin_settings']['payment_details'] = message.text
            save_all_data(data)
            await message.answer("✅ Реквизиты обновлены!")
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
            await message.answer(settings.get('payment_details', 'Not set'))
            return
        
        if data.get('type') == 'get_user_requests':
            user_requests = []
            data_file = 'data.json'
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    all_data = json.load(f)
                    for req in all_data.get('topup_requests', []):
                        if req['user_id'] == message.from_user.id:
                            user_requests.append({
                                'id': req['id'],
                                'amount': req.get('amount', 0),
                                'status': req['status'],
                                'created_at': req['created_at'],
                                'payment_proof': req.get('payment_proof', 'Не загружен')
                            })
            
            await message.answer(f"USER_REQUESTS:{json.dumps(user_requests)}")
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
        
        elif data.get('type') == 'premium':
            settings = get_admin_settings()
            premium_price = settings.get('premium_price', 50000)
            
            if deduct_balance(message.from_user.id, premium_price):
                add_purchase(message.from_user.id, 'premium', 0, premium_price, 'Telegram Premium')
                await message.answer(f"✅ Telegram Premium активирован!\n💰 {premium_price:,} so'm")
            else:
                await message.answer("❌ Недостаточно средств\nПополните баланс")
    except Exception as e:
        logger.error(f"Error in process_webapp_ {e}")

async def main():
    logger.info("Starting bot...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())