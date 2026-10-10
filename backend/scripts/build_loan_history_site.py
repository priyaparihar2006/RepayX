"""Build a standalone public demo from sample loan records only (no phone numbers)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.whatsapp_service import DEMO_CONTACTS, DEMO_LOAN_HISTORY

output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "loan-history-site" / "public"
output.mkdir(parents=True, exist_ok=True)
records = {}
for contact in DEMO_CONTACTS:
    loan = DEMO_LOAN_HISTORY[contact["customer_id"]]
    paid = sum(amount for _, amount in loan["payments"])
    records[str(contact["customer_id"])] = {
        "name": contact["name"], "id": contact["customer_id"], **loan,
        "paid_paise": paid, "remaining_paise": loan["total_paise"] - paid,
        "late_days": contact["late_days"],
    }
html = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>RepayX | Loan statement</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#172338;font:15px/1.6 system-ui,sans-serif}
header{background:#10253c;color:white;padding:22px max(24px,calc((100vw - 900px)/2))}.brand{font-weight:800;font-size:23px;letter-spacing:-1px}.brand span{color:#57dfb8}
main{max-width:948px;margin:32px auto;padding:0 24px 48px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#567086;font-weight:700}h1{font-size:clamp(28px,5vw,38px);letter-spacing:-1px;line-height:1.2;margin:10px 0}h2{font-size:18px;margin:0 0 18px}
.sub{color:#63748b}.badge{display:inline-block;border-radius:30px;background:#fff0d4;color:#935a08;padding:5px 12px;font-size:12px;font-weight:700}.intro{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:26px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}.card,.panel{background:white;border:1px solid #dfe7ef;border-radius:18px;padding:24px}.card p{margin:0;color:#63748b;font-size:13px}.card strong{display:block;font-size:clamp(20px,3vw,29px);margin-top:8px}.paid strong{color:#138364}.balance{background:#10253c;color:white}.balance p{color:#b7cbdc}.panel{margin-top:20px}dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:0 32px}dl div{display:flex;justify-content:space-between;gap:15px;padding:13px 0;border-bottom:1px solid #eef1f5}dt{color:#63748b}dd{margin:0;text-align:right;font-weight:600}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#63748b}td,th{padding:14px 12px;border-bottom:1px solid #eef1f5}.ok{color:#138364}.due{color:#af5a08}footer{font-size:12px;color:#6d7d90;margin-top:24px}button{cursor:pointer;background:#10253c;color:white;border:0;border-radius:10px;padding:10px 16px;font:inherit}.hidden{display:none}
@media(max-width:600px){main{padding:0 16px}.cards{grid-template-columns:1fr;gap:10px}.card{padding:18px}.card strong{font-size:26px}dl{grid-template-columns:1fr}.intro{align-items:start}.panel{padding:18px}td,th{padding:12px 8px}}
@media print{body{background:white}header,button{display:none}main{margin:0;max-width:none}.panel,.card{break-inside:avoid}.balance{background:white;color:#172338}.balance p{color:#63748b}}
</style></head><body><header><div class="brand">Repay<span>X</span></div><div>Loan statement</div></header>
<main><section id="empty"><h1>Loan statement</h1><p class="sub">Open the personal loan-history link in your WhatsApp message to view the statement.</p></section>
<section id="statement" class="hidden"><div class="intro"><div><div class="eyebrow">Your loan at a glance</div><h1 id="name"></h1><div class="sub" id="account"></div></div><span class="badge">Demo statement</span></div>
<div class="cards"><div class="card"><p>Total loan amount</p><strong id="total"></strong></div><div class="card paid"><p>Paid so far</p><strong id="paid"></strong></div><div class="card balance"><p>Remaining balance</p><strong id="remaining"></strong></div></div>
<section class="panel"><h2>Loan summary</h2><dl id="summary"></dl></section>
<section class="panel"><h2>Full payment history</h2><div class="table-wrap"><table><thead><tr><th>Installment</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="payments"></tbody></table></div></section>
<footer><p>Sample loan data for the RepayX manager demonstration. Statement as of 9 October 2026. This page does not collect payments.</p><button id="print" type="button">Print / save as PDF</button></footer></section></main>
<script>
const records=__RECORDS__;
const id=new URLSearchParams(location.search).get('loan');
const loan=Object.hasOwn(records,id)?records[id]:null;
const money=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(paise/100);
if(loan){
 document.getElementById('empty').hidden=true;document.getElementById('statement').classList.remove('hidden');
 for(const [key,value] of Object.entries({name:loan.name,account:'Loan account #'+loan.id,total:money(loan.total_paise),paid:money(loan.paid_paise),remaining:money(loan.remaining_paise)})){document.getElementById(key).textContent=value;}
 const summary=[['Loan opened',loan.opened],['Total loan amount',money(loan.total_paise)],['Interest / additional charges',money(0)],['Total amount payable',money(loan.total_paise)],['Total paid so far',money(loan.paid_paise)],['Remaining balance',money(loan.remaining_paise)],['Overdue amount',money(loan.remaining_paise)],['Payment due date',loan.due],['Days overdue',loan.late_days+' days'],['Installments paid',loan.payments.length+' of '+(loan.payments.length+1)]];
 for(const [label,value] of summary){const row=document.createElement('div');const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);document.getElementById('summary').append(row);}
 [...loan.payments.map(([date,amount])=>[date,amount,'Paid']),[loan.due,loan.remaining_paise,'Unpaid (overdue)']].forEach(([date,amount,status],index)=>{const tr=document.createElement('tr');[index+1,date,money(amount),status].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===3)td.className=status==='Paid'?'ok':'due';tr.append(td);});document.getElementById('payments').append(tr);});
 document.getElementById('print').addEventListener('click',()=>window.print());
}else if(id){document.querySelector('#empty p').textContent='This loan statement was not found. Please check the link in your message.';}
</script></body></html>'''
(output / "index.html").write_text(html.replace("__RECORDS__", json.dumps(records, ensure_ascii=True)), encoding="utf-8")
print(f"Built {len(records)} sample statements in {output}")
