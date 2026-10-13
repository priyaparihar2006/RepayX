"""No live credentials or external SMTP calls in these tests."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
import os

from scripts import check_smtp
from automation.config import AutomationConfig
from automation.service import AutomationService
from automation.util import utcnow
from services.csv_scheduler_service import CSVSchedulerService


def test_verifier_logs_in_but_never_sends(monkeypatch):
    calls = []
    cfg = SimpleNamespace(mode='sandbox', email_provider='smtp',
                          email_from_address='fixture@example.invalid', smtp_username='fixture@example.invalid',
                          smtp_password='test-only-placeholder', smtp_host='smtp.gmail.com', smtp_port=587,
                          smtp_use_tls=True)
    monkeypatch.setattr(check_smtp, 'AutomationConfig', lambda: cfg)
    monkeypatch.setattr(check_smtp, 'load_environment', lambda: None)
    class FakeSMTP:
        def __init__(self, *args, **kwargs): calls.append('connect')
        def ehlo(self): calls.append('ehlo')
        def starttls(self, **kwargs): calls.append('tls')
        def login(self, *args): calls.append('login')
        def quit(self): calls.append('quit')
        # Any attempt to call send_message/mail/rcpt/data fails this test.
    monkeypatch.setattr(check_smtp.smtplib, 'SMTP', FakeSMTP)
    result = check_smtp.check()
    assert result['authentication'] == 'PASS' and result['email_sent'] is False
    assert calls == ['connect', 'ehlo', 'tls', 'ehlo', 'login', 'quit']


def test_csv_customer_and_numeric_balance_validation(tmp_path):
    importer = CSVSchedulerService(tmp_path / 'legacy.sqlite3')
    for customer, amount in [('', '100'), ('TEST', ''), ('TEST', 'abc100'), ('TEST', '-100'), ('TEST', 'inf')]:
        result = importer.parse_csv_content(
            f'customer_id,customer_name,phone_number,unpaid_amount\n{customer},Test,+12025550123,{amount}\n')
        assert result['records'][0]['is_valid'] is False


def test_email_only_exact_job_uses_sandbox_not_smtp(tmp_path, monkeypatch):
    # Config factories see an empty environment, not the user's Gmail secrets.
    with patch.dict(os.environ, {}, clear=True):
        config = AutomationConfig(db_path=tmp_path / 'sandbox.sqlite3', mode='sandbox')
    assert not config.smtp_password and not config.smtp_username
    def forbidden(*args, **kwargs): raise AssertionError('Sandbox must not connect to SMTP')
    monkeypatch.setattr(check_smtp.smtplib, 'SMTP', forbidden)
    svc = AutomationService(config)
    svc.policy.update({'contact_window_start': '00:00', 'contact_window_end': '23:59'}, 'test')
    from zoneinfo import ZoneInfo
    target = (utcnow() + timedelta(days=1)).astimezone(ZoneInfo('Asia/Kolkata')).replace(hour=12, minute=0, second=17, microsecond=0)
    text = ('customer_id,customer_name,email,loan_id,unpaid_amount,due_date,reminder_datetime,channel_strategy\n'
            f'TEST,Test Customer,test@example.invalid,TEST-LOAN,100,{target.date()},{target:%Y-%m-%d %H:%M:%S},all\n')
    result = svc.importer.run(text.encode(), 'sandbox.csv', 'test', svc.policy.get(), utcnow())
    assert result.reconcile.scheduled == 1
    assert svc.tick(target - timedelta(seconds=1))['claimed'] == 0
    assert svc.tick(target)['outcomes'] == {'completed': 1}
    with svc.db.read() as conn:
        delivery = conn.execute("SELECT * FROM message_deliveries WHERE channel = 'email'").fetchone()
        assert delivery['provider'] == 'sandbox' and delivery['status'] == 'accepted'
        assert delivery['delivered_at'] is None
