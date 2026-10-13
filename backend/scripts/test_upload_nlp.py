import json
import urllib.request

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
csv_data = 'borrower_name,phone,total_loan,emi_paid,emi_left,last_date_to_pay\nSuresh Raina,+918650629360,250000,100000,150000,2026-10-18\nManish Pandey,7060200849,180000,60000,120000,2026-10-02\n'

parts = [
    f'--{boundary}',
    'Content-Disposition: form-data; name="file"; filename="test_defaulters.csv"',
    'Content-Type: text/csv',
    '',
    csv_data,
    f'--{boundary}--',
    ''
]
payload = '\r\n'.join(parts).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/whatsapp/upload-defaulters-file?auto_send=false',
    data=payload,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

with urllib.request.urlopen(req) as r:
    res = json.loads(r.read().decode('utf-8'))
    print(f"Status: {r.status} OK")
    print(f"Extracted count: {res.get('extracted_count')}")
    for rec in res.get('records', []):
        print(f"-> {rec['customer_name']} | Status: {rec['urgency_status']} | Due: {rec['last_date_to_pay']}")

