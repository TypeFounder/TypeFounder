import json
import os

DATA_FILE = 'data.json'

if os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        print("Payment details:", data.get('admin_settings', {}).get('payment_details', 'Not found'))
else:
    print("File not found!")