import json
import os
from datetime import datetime

DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    default_data = {
        'admins': [],
        'admin_settings': {
            'star_rate': 200,
            'premium_price': 50000,
            'star_prices': {50: 10000, 75: 14000, 100: 18000, 250: 42000, 500: 80000},
            'gifts': [
                {'id': 1, 'emoji': '🌹', 'name': 'Atirgul', 'stars': 15, 'price': 3000},
                {'id': 2, 'emoji': '🔥', 'name': 'Olov', 'stars': 20, 'price': 4000},
                {'id': 3, 'emoji': '💎', 'name': 'Olmos', 'stars': 30, 'price': 6000},
                {'id': 4, 'emoji': '👑', 'name': 'Toj', 'stars': 50, 'price': 10000},
                {'id': 5, 'emoji': '🚀', 'name': 'Raketa', 'stars': 75, 'price': 15000},
                {'id': 6, 'emoji': '🏆', 'name': 'Kubok', 'stars': 100, 'price': 20000}
            ],
            'payment_details': "Karta: 8600 1234 5678 9012\nTelefon: +998 90 123 45 67"
        },
        'users': {},
        'topup_requests': [],
        'purchases': []
    }
    
    save_data(default_data)
    return default_data

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_user(user_id):
    data = load_data()
    if str(user_id) not in data['users']:
        data['users'][str(user_id)] = {
            'user_id': user_id, 'username': '', 'balance': 0,
            'language': 'uz', 'total_spent': 0, 'purchases': []
        }
        save_data(data)
    return data['users'][str(user_id)]

def update_user(user_id, updates):
    data = load_data()
    if str(user_id) in data['users']:
        data['users'][str(user_id)].update(updates)
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

def add_balance(user_id, amount):
    data = load_data()
    if str(user_id) in data['users']:
        data['users'][str(user_id)]['balance'] += amount
        save_data(data)

def create_topup_request(user_id, amount, payment_proof, username='Не указан'):
    data = load_data()
    request = {
        'id': len(data['topup_requests']) + 1,
        'user_id': user_id,
        'username': username,
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
            add_balance(request['user_id'], request['amount'])
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
        'type': item_type, 'stars': stars, 'price': price,
        'details': details, 'timestamp': datetime.now().isoformat()
    }
    data['purchases'].append(purchase)
    if str(user_id) in data['users']:
        data['users'][str(user_id)]['purchases'].append(purchase)
        data['users'][str(user_id)]['total_spent'] += price
    save_data(data)

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
    return load_data()['admin_settings']