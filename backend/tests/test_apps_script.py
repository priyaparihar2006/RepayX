"""Apps Script integration: all external transport is mocked and sockets are blocked."""
import hashlib
import hmac
import json
import socket
from dataclasses import replace
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from automation.providers import build_providers
from automation.providers import apps_script as gas
from automation.providers.base import OutboundMessage, SendResult
from automation.service import AutomationService
from tests.automation_helpers import AUTH, csv_text, deliveries, import_csv, ist, jobs, make_config, make_providers
from tests.conftest import make_settings

RECIPIENTS = ('one@example.invalid', 'two@example.invalid', 'three@example.invalid')
HEADER = 'customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,timezone,consent_status,sms_enabled'
NOW = ist(2030, 10, 13, 12)


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    connect = socket.socket.connect
    def blocked(sock, address):
        # Windows asyncio implements socketpair using a loopback TCP connection.
        if isinstance(address, tuple) and address[0] in ('127.0.0.1', '::1'):
            return connect(sock, address)
        raise AssertionError('External network is forbidden in these tests')
    monkeypatch.setattr(socket.socket, 'connect', blocked)


def config(tmp_path, **changes):
    return make_config(tmp_path, email_provider='google_apps_script',
                       apps_script_url='https://script.google.com/macros/s/test-deployment/exec',
                       apps_script_secret='test-only-shared-secret-not-a-real-key',
                       apps_script_allowed_recipients=RECIPIENTS, **changes)


def message():
    return OutboundMessage(channel='email', recipient=RECIPIENTS[0], text='unused', idempotency_key='job:email',
                           template_params={'name': '<Test>', 'loan_id': 'L1', 'amount': 'INR 100', 'due_date': '2030-10-20'})


def test_signed_body_and_stable_idempotency(tmp_path, monkeypatch):
    c = config(tmp_path)
    calls = []
    def post(url, body):
        env = json.loads(body)
        assert c.apps_script_secret not in body.decode()
        signed = f"{env['timestamp']}\n{env['nonce']}\n{env['payload']}".encode()
        assert hmac.compare_digest(env['signature'], hmac.new(c.apps_script_secret.encode(), signed, hashlib.sha256).hexdigest())
        payload = json.loads(env['payload'])
        assert payload['recipient'] == RECIPIENTS[0]
        assert 'html' not in payload and 'subject' not in payload
        calls.append(payload)
        return {'status': 'accepted', 'request_id': payload['request_id']}
    monkeypatch.setattr(gas, 'post_envelope', post)
    provider = gas.AppsScriptEmailProvider(c)
    assert provider.send(message()).accepted
    assert provider.send(message()).accepted
    assert calls[0]['request_id'] == calls[1]['request_id']


@pytest.mark.parametrize('status,transient,code', [
    ('busy', True, 'apps_script_busy'), ('quota_exceeded', True, 'apps_script_quota_exceeded'),
    ('disabled', False, 'apps_script_disabled'), ('unknown', False, 'ambiguous_timeout'),
    ('ledger_full', False, 'apps_script_ledger_full'),
])
def test_provider_outcomes(tmp_path, monkeypatch, status, transient, code):
    monkeypatch.setattr(gas, 'post_envelope', lambda url, body: {
        'status': status, 'request_id': json.loads(json.loads(body)['payload'])['request_id']})
    result = gas.AppsScriptEmailProvider(config(tmp_path)).send(message())
    assert not result.accepted and result.transient == transient and result.error_code == code


def test_timeout_is_unknown_and_never_exposes_provider_text(tmp_path, monkeypatch):
    def fail(*args): raise TimeoutError('secret-provider-content')
    monkeypatch.setattr(gas, 'post_envelope', fail)
    result = gas.AppsScriptEmailProvider(config(tmp_path)).send(message())
    assert result.error_code == 'ambiguous_timeout' and not result.transient
    assert 'secret-provider-content' not in result.error_message


def test_allowlist_url_and_sandbox(tmp_path):
    c = config(tmp_path)
    assert not gas.AppsScriptEmailProvider(c).send(replace(message(), recipient='outside@example.invalid')).accepted
    assert gas.AppsScriptEmailProvider(replace(c, apps_script_url='http://localhost/exec')).configuration_problem()
    assert gas.AppsScriptEmailProvider(replace(c, apps_script_allowed_recipients=())).configuration_problem()
    assert build_providers(replace(c, mode='sandbox'))['email'].sandbox
    with pytest.raises(ValueError):
        gas.GoogleRedirects().redirect_request(None, None, 302, '', {}, 'https://evil.example/collect')
    redirected = gas.GoogleRedirects().redirect_request(None, None, 302, '', {}, 'https://script.googleusercontent.com/macros/echo?x=1')
    assert redirected.get_method() == 'GET' and redirected.data is None


def make_csv(count=3, consent='granted'):
    return csv_text(*(f'C{i},Test {i},+12025550123,{RECIPIENTS[i]},L{i},100,2030-10-20,2030-10-13 12:0{i+1}:00,all,Asia/Kolkata,{consent},no'
                      for i in range(count)), header=HEADER)


def test_multi_recipient_exact_scheduling_independent_failures_and_no_duplicates(tmp_path, monkeypatch):
    calls = []
    def post(url, body):
        p = json.loads(json.loads(body)['payload']); calls.append(p)
        return {'request_id': p['request_id'], 'status': 'disabled' if p['recipient'] == RECIPIENTS[0] else 'accepted'}
    monkeypatch.setattr(gas, 'post_envelope', post)
    c = config(tmp_path); providers = make_providers(); providers['email'] = gas.AppsScriptEmailProvider(c)
    providers['whatsapp'].results = [SendResult.ok('wa1'), SendResult.fail('wa_error', 'Failed', False), SendResult.ok('wa3')]
    service = AutomationService(c, providers)
    result = import_csv(service, make_csv(), NOW)
    assert result.imported_rows == 3 and result.reconcile.scheduled == 3
    assert service.tick(NOW + timedelta(seconds=59))['claimed'] == 0
    for minute in (1, 2, 3):
        assert service.tick(NOW + timedelta(minutes=minute))['claimed'] == 1
    assert len(calls) == 3 and len(providers['whatsapp'].sent) == 3 and not providers['sms'].sent
    records = {j['customer_id']: deliveries(service, j['id']) for j in jobs(service)}
    assert records['C0']['email']['status'] == 'failed' and records['C0']['whatsapp']['status'] == 'accepted'
    assert records['C1']['email']['status'] == 'accepted' and records['C1']['whatsapp']['status'] == 'failed'
    assert all(records[cid]['email']['last_attempt_at'] for cid in records)
    assert all(records[cid]['email']['delivered_at'] is None for cid in records)
    service.tick(NOW + timedelta(minutes=4))
    assert len(calls) == 3


def test_quota_retries_are_bounded_and_do_not_resend_whatsapp(tmp_path, monkeypatch):
    calls=[]
    def post(url, body):
        p=json.loads(json.loads(body)['payload']); calls.append(p)
        return {'request_id':p['request_id'],'status':'quota_exceeded'}
    monkeypatch.setattr(gas,'post_envelope',post)
    c=config(tmp_path, retry_max_attempts=2)
    providers=make_providers(); providers['email']=gas.AppsScriptEmailProvider(c)
    service=AutomationService(c,providers)
    import_csv(service,make_csv(1),NOW)
    service.tick(NOW+timedelta(minutes=1))
    assert jobs(service)[0]['status']=='retry'
    service.tick(NOW+timedelta(minutes=3))
    [job]=jobs(service)
    records=deliveries(service,job['id'])
    assert records['email']['status']=='failed' and records['email']['attempt_count']==2
    assert records['whatsapp']['status']=='accepted' and len(providers['whatsapp'].sent)==1
    service.tick(NOW+timedelta(minutes=5))
    assert len(calls)==2


def test_apps_script_history_uses_fixed_escaped_template_without_payment_links(tmp_path):
    c=config(tmp_path,mode='sandbox')
    service=AutomationService(c)
    import_csv(service,make_csv(1),NOW)
    service.tick(NOW+timedelta(minutes=1))
    with service.db.read() as conn:
        row=conn.execute("SELECT subject,content FROM communications WHERE channel='email'").fetchone()
    assert row['subject']=='RepayX — EMI Payment Reminder'
    assert 'RepayX Team' in row['content'] and 'http' not in row['content']


@pytest.mark.parametrize('reason', ['paid', 'consent', 'email_disabled', 'global_disabled', 'paused'])
def test_existing_eligibility_guards(tmp_path, monkeypatch, reason):
    def forbidden(*args): raise AssertionError('Ineligible email reached transport')
    monkeypatch.setattr(gas, 'post_envelope', forbidden)
    c=config(tmp_path); providers=make_providers(); providers['email']=gas.AppsScriptEmailProvider(c)
    service=AutomationService(c,providers)
    import_csv(service, make_csv(1, 'unknown' if reason=='consent' else 'granted'), NOW)
    with service.db.write() as conn:
        if reason=='paid': conn.execute("UPDATE emis SET payment_status='paid', amount_paid=emi_amount")
        if reason=='email_disabled': conn.execute('UPDATE customers SET email_enabled=0')
    if reason=='global_disabled': service.policy.update({'channels_enabled':{'email':False,'sms':True,'whatsapp':True}},'test')
    if reason=='paused': service.policy.update({'automation_paused':True},'test')
    service.tick(NOW+timedelta(minutes=1))
    with service.db.read() as conn:
        assert conn.execute("SELECT count(*) FROM message_deliveries WHERE channel='email' AND attempt_count>0").fetchone()[0]==0


def test_admin_flow_defaults_to_simulation_and_requires_all_gates(tmp_path, monkeypatch):
    c=config(tmp_path, mode='sandbox', apps_script_test_send_enabled=False)
    service=AutomationService(c)
    body={'request_id':str(uuid4()),'recipient':RECIPIENTS[0],'authorized':True}
    with TestClient(create_app(make_settings(tmp_path), automation=service)) as client:
        assert client.get('/api/automation/email-test',headers=AUTH['operator']).status_code==403
        assert client.post('/api/automation/email-test',headers=AUTH['viewer'],json=body).status_code==403
        simulated=client.post('/api/automation/email-test',headers=AUTH['admin'],json=body)
        assert simulated.json()['run']['status']=='simulated'
        assert client.post('/api/automation/email-test',headers=AUTH['admin'],json={**body,'send_real':True}).status_code==403
        assert client.post('/api/automation/email-test',headers=AUTH['admin'],json={**body,'recipient':'outside@example.invalid'}).status_code==403
        assert client.post('/api/automation/email-test',headers=AUTH['admin'],json={**body,'authorized':False}).status_code==422
        assert client.get('/api/automation/email-test',headers=AUTH['admin']).json()['runs'][0]['recipient']!=RECIPIENTS[0]


def test_admin_real_test_is_idempotent_and_rate_limited_with_mock_transport(tmp_path, monkeypatch):
    c=config(tmp_path, mode='sandbox', apps_script_test_send_enabled=True)
    service=AutomationService(c)
    calls=[]
    def post(url, body):
        p=json.loads(json.loads(body)['payload']); calls.append(p)
        return {'request_id':p['request_id'],'status':'accepted'}
    monkeypatch.setattr(gas,'post_envelope',post)
    body={'request_id':str(uuid4()),'recipient':RECIPIENTS[0],'authorized':True,'send_real':True}
    with TestClient(create_app(make_settings(tmp_path),automation=service)) as client:
        for _ in range(2):
            assert client.post('/api/automation/email-test',headers=AUTH['admin'],json=body).json()['run']['status']=='accepted'
        assert len(calls)==1
        assert client.post('/api/automation/email-test',headers=AUTH['admin'],json={**body,'recipient':RECIPIENTS[1]}).status_code==409
        assert client.post('/api/automation/email-test',headers=AUTH['admin'],json={**body,'request_id':str(uuid4())}).status_code==429
        assert service.config.mode=='sandbox'
        with service.db.read() as conn:
            assert conn.execute('SELECT count(*) FROM reminder_jobs').fetchone()[0]==0
