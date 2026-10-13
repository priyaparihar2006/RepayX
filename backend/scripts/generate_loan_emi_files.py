import json
import csv
from pathlib import Path

data_dir = Path('backend/data')
data_dir.mkdir(parents=True, exist_ok=True)

# 1. Base demo recipients & users
records = [
    {
        'customer_id': 385057,
        'customer_name': 'Nancy',
        'phone': '+917060200849',
        'total_loan_amount': 100000.00,
        'emi_paid_amount': 36497.49,
        'emi_left_to_repay': 63502.51,
        'monthly_emi': 12000.00,
        'emis_paid_count': 3,
        'emis_remaining_count': 6,
        'total_tenure_months': 9,
        'interest_rate_pct': 11.5,
        'loan_disbursed_date': '2026-04-30',
        'next_due_date': '2026-08-30',
        'days_past_due': 40,
        'risk_score': 84.2,
        'risk_tier': 'High Risk',
        'payment_status': 'Overdue (40 days)',
        'payment_link': 'https://pay.repayx.ai/inv/385057'
    },
    {
        'customer_id': 385058,
        'customer_name': 'Sid',
        'phone': '+919105830551',
        'total_loan_amount': 100000.00,
        'emi_paid_amount': 57250.00,
        'emi_left_to_repay': 42750.00,
        'monthly_emi': 20000.00,
        'emis_paid_count': 3,
        'emis_remaining_count': 3,
        'total_tenure_months': 6,
        'interest_rate_pct': 10.5,
        'loan_disbursed_date': '2026-05-14',
        'next_due_date': '2026-09-14',
        'days_past_due': 25,
        'risk_score': 71.8,
        'risk_tier': 'High Risk',
        'payment_status': 'Overdue (25 days)',
        'payment_link': 'https://pay.repayx.ai/inv/385058'
    },
    {
        'customer_id': 385059,
        'customer_name': 'Ajay',
        'phone': '+918077815522',
        'total_loan_amount': 75000.00,
        'emi_paid_amount': 46100.00,
        'emi_left_to_repay': 28900.00,
        'monthly_emi': 15000.00,
        'emis_paid_count': 3,
        'emis_remaining_count': 2,
        'total_tenure_months': 5,
        'interest_rate_pct': 12.0,
        'loan_disbursed_date': '2026-05-21',
        'next_due_date': '2026-09-21',
        'days_past_due': 18,
        'risk_score': 64.5,
        'risk_tier': 'Medium Risk',
        'payment_status': 'Overdue (18 days)',
        'payment_link': 'https://pay.repayx.ai/inv/385059'
    },
    {
        'customer_id': 385000,
        'customer_name': 'Priya Parihar (Admin Account)',
        'phone': '+918650629360',
        'total_loan_amount': 150000.00,
        'emi_paid_amount': 95000.00,
        'emi_left_to_repay': 55000.00,
        'monthly_emi': 18500.00,
        'emis_paid_count': 5,
        'emis_remaining_count': 3,
        'total_tenure_months': 8,
        'interest_rate_pct': 9.8,
        'loan_disbursed_date': '2026-03-15',
        'next_due_date': '2026-09-15',
        'days_past_due': 24,
        'risk_score': 76.0,
        'risk_tier': 'High Risk',
        'payment_status': 'Overdue (24 days)',
        'payment_link': 'https://pay.repayx.ai/inv/385000'
    }
]

# 2. Enrich from defaulters_500.json
d500_path = data_dir / 'defaulters_500.json'
if d500_path.exists():
    try:
        d500 = json.loads(d500_path.read_text(encoding='utf-8'))
        for item in d500:
            cid = item.get('customer_id', 385000)
            if cid in [385057, 385058, 385059, 385000]:
                continue
            unpaid = float(item.get('unpaid_amount') or item.get('total_unpaid_amount', 15000.0))
            credit = float(item.get('credit_amount', 100000.0))
            paid = max(0.0, round(credit - unpaid, 2))
            late = int(item.get('late_days') or item.get('avg_days_late', 12))
            tenure = 12
            monthly = round(credit / tenure, 2)
            paid_count = max(1, int(paid / max(1.0, monthly)))
            rem_count = max(1, tenure - paid_count)
            
            records.append({
                'customer_id': cid,
                'customer_name': item.get('customer_name') or item.get('name', f'Customer #{cid}'),
                'phone': item.get('phone', f'+9198{cid % 90000000 + 10000000:08d}'),
                'total_loan_amount': round(credit, 2),
                'emi_paid_amount': round(paid, 2),
                'emi_left_to_repay': round(unpaid, 2),
                'monthly_emi': round(monthly, 2),
                'emis_paid_count': paid_count,
                'emis_remaining_count': rem_count,
                'total_tenure_months': tenure,
                'interest_rate_pct': 11.0,
                'loan_disbursed_date': '2026-03-01',
                'next_due_date': item.get('last_due_date', '2026-09-20'),
                'days_past_due': late,
                'risk_score': round(float(item.get('risk_score', 75.0)), 1),
                'risk_tier': str(item.get('risk_tier') or item.get('risk_category', 'High Risk')),
                'payment_status': f'Overdue ({late} days)' if late > 0 else 'Current',
                'payment_link': item.get('payment_link', f'https://pay.repayx.ai/inv/{cid}')
            })
    except Exception as e:
        print('Error parsing defaulters_500:', e)

# 1. Write users_loan_emi_data.json
json_path = data_dir / 'users_loan_emi_data.json'
json_path.write_text(json.dumps(records, indent=2), encoding='utf-8')
print(f'Wrote JSON: {json_path} (Total: {len(records)} records)')

# 2. Write users_loan_emi_data.csv
csv_path = data_dir / 'users_loan_emi_data.csv'
fields = list(records[0].keys())
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
print(f'Wrote CSV: {csv_path}')

# 3. Write repayx_whatsapp_config.env
env_path = data_dir / 'repayx_whatsapp_config.env'
env_lines = [
    '# RepayX WhatsApp & Autonomous AI Outreach Configuration',
    'API_HOST=127.0.0.1',
    'API_PORT=8000',
    'WHATSAPP_BRIDGE_PORT=8005',
    'WHATSAPP_ENABLED=true',
    'WHATSAPP_OPERATOR_PHONE=+918650629360',
    'WHATSAPP_SENDER_NAME="RepayX Verified Agent"',
    '',
    '# AI Autonomous Auto-Pilot Settings',
    'WHATSAPP_AI_AUTONOMOUS_ENABLED=true',
    'WHATSAPP_AI_AUTO_DISPATCH_INTERVAL_SEC=300',
    'WHATSAPP_AI_AUTO_REPLY_ENABLED=true',
    'WHATSAPP_AI_MAX_BATCH_SIZE=25',
    'WHATSAPP_AI_OUTREACH_DELAY_MS=500',
    '',
    '# Loan & EMI Dataset Paths',
    'USERS_LOAN_EMI_JSON=backend/data/users_loan_emi_data.json',
    'USERS_LOAN_EMI_CSV=backend/data/users_loan_emi_data.csv',
]
env_path.write_text('\n'.join(env_lines) + '\n', encoding='utf-8')
print(f'Wrote ENV: {env_path}')

