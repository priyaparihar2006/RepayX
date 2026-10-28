"""Exact CSV scheduling uses the existing queue and provider state machine."""
from datetime import timedelta
import sqlite3

import pytest

from api.routes_automation import _job_public
from automation.db import Database, SCHEMA_SQL
from automation.providers.base import SendResult
from automation.service import AutomationService
from automation.scheduler import reconcile_all
from automation.webhooks import StatusEvent, apply_status
from tests.automation_helpers import (
    csv_text, deliveries, import_csv, ist, jobs, make_config, make_service,
)

HEADER = 'customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,payment_status'
NOW = ist(2026, 10, 12, 15)
AT = ist(2026, 10, 12, 16, 0, 37)


def row(at='2026-10-12 16:00:37', strategy='all', ident='1'):
    return f'TEST-{ident},Sandbox Customer,+12025550123,test@example.invalid,TEST-LN-{ident},8500,2026-10-13,{at},{strategy},pending'


def upload(svc, *rows):
    return import_csv(svc, csv_text(*(rows or [row()]), header=HEADER), NOW)


def test_exact_import_seconds_timezone_idempotency_restart_and_boundary(tmp_path):
    svc = make_service(tmp_path)
    summary = upload(svc)
    assert summary.reconcile.scheduled == 1
    [job] = jobs(svc)
    assert job['scheduled_at_utc'] == '2026-10-12T10:30:37Z'
    assert job['channel_strategy'] == 'all'
    assert upload(svc).unchanged_rows == 1
    assert len(jobs(svc)) == 1
    restarted = make_service(tmp_path, worker_id='restarted')
    assert restarted.tick(AT - timedelta(seconds=1))['claimed'] == 0
    assert restarted.tick(AT)['outcomes'] == {'completed': 1}
    assert len(deliveries(restarted, job['id'])) == 3
    assert restarted.tick(AT + timedelta(seconds=1))['claimed'] == 0


@pytest.mark.parametrize('bad', ['', '12/10/2026 16:00:00', '2026-10-12T16:00:00',
                                  '2026-02-30 16:00:00', '2026-10-12 14:59:59',
                                  '2026-10-12 20:00:00', '2026-10-12 15:00:00'])
def test_invalid_exact_rows_do_not_lose_valid_rows(tmp_path, bad):
    svc = make_service(tmp_path)
    result = upload(svc, row(bad), row(ident='2'))
    assert result.rejected_rows == 1 and result.imported_rows == 1
    assert any(i['row'] == 2 and i['field'] == 'reminder_datetime' for i in result.issues)
    assert len(jobs(svc)) == 1


def test_invalid_strategy_and_conflicting_legacy_columns(tmp_path):
    svc = make_service(tmp_path)
    assert upload(svc, row(strategy='blast')).rejected_rows == 1
    result = import_csv(svc, csv_text(row() + ',2026-10-12', header=HEADER + ',reminder_date'), NOW)
    assert result.rejected_rows == 1


@pytest.mark.parametrize('strategy,expected', [('all', 3), ('fallback', 1)])
def test_csv_strategy_survives_policy_reconciliation(tmp_path, strategy, expected):
    svc = make_service(tmp_path)
    upload(svc, row(strategy=strategy))
    policy = svc.policy.update({'channel_strategy': 'fallback' if strategy == 'all' else 'all'}, 'test')
    with svc.db.write() as conn:
        reconcile_all(conn, policy, NOW, 'test')
    svc.tick(AT)
    assert len(deliveries(svc, jobs(svc)[0]['id'])) == expected


def test_fallback_permanent_error_and_ambiguous_timeout(tmp_path):
    svc = make_service(tmp_path)
    upload(svc, row(strategy='fallback'))
    svc.providers['whatsapp'].results = [SendResult.fail('invalid', 'Rejected', transient=False)]
    svc.providers['sms'].results = [TimeoutError()]
    svc.tick(AT)
    [job] = jobs(svc)
    ds = deliveries(svc, job['id'])
    assert ds['sms']['status'] == 'unknown'
    assert not svc.providers['email'].sent
    svc.tick(AT + timedelta(minutes=1))
    assert len(svc.providers['sms'].sent) == 1
    assert _job_public(job, list(ds.values()))['display_status'] == 'unknown'


def test_sandbox_status_no_network_no_delivered_claim(tmp_path, monkeypatch):
    import socket
    def forbidden(*args, **kwargs):
        raise AssertionError('Sandbox attempted external networking')
    monkeypatch.setattr(socket, 'create_connection', forbidden)
    svc = AutomationService(make_config(tmp_path, mode='sandbox'))
    upload(svc)
    svc.tick(AT)
    [job] = jobs(svc)
    ds = deliveries(svc, job['id'])
    assert len(ds) == 3
    assert all(d['provider'] == 'sandbox' and d['delivered_at'] is None for d in ds.values())
    result = _job_public(job, list(ds.values()))
    assert result['display_status'] == 'simulated'
    assert all(d['display_status'] == 'simulated' for d in result['deliveries'])


def test_v1_database_migrates_without_losing_records(tmp_path):
    path = tmp_path / 'v1.sqlite3'
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.execute("INSERT INTO schema_migrations VALUES (1, '2026-10-12')")
    Database(path)
    Database(path)
    with sqlite3.connect(path) as conn:
        assert (3,) in conn.execute('SELECT version FROM schema_migrations ORDER BY version').fetchall()
        assert 'reminder_datetime_utc' in {r[1] for r in conn.execute('PRAGMA table_info(emis)')}


def test_exact_schedule_is_not_shifted_by_policy_change(tmp_path):
    svc = make_service(tmp_path)
    upload(svc)
    updated = svc.policy.update({'contact_window_end': '15:30'}, 'test')
    with svc.db.write() as conn:
        reconcile_all(conn, updated, NOW, 'test')
    assert jobs(svc)[0]['scheduled_at_utc'] == '2026-10-12T10:30:37Z'
    assert svc.tick(AT)['outcomes'] == {'deferred': 1}
    assert not deliveries(svc, jobs(svc)[0]['id'])


@pytest.mark.parametrize('strategy', ['all', 'fallback'])
def test_async_provider_failure_uses_job_strategy(tmp_path, strategy):
    svc = make_service(tmp_path)
    upload(svc, row(strategy=strategy))
    svc.tick(AT)
    [job] = jobs(svc)
    svc.policy.update({'channel_strategy': 'fallback' if strategy == 'all' else 'all'}, 'test')
    delivery = deliveries(svc, job['id'])['whatsapp']
    with svc.db.write() as conn:
        apply_status(conn, 'meta_cloud', StatusEvent(delivery['provider_message_id'], 'failed'), AT)
    assert jobs(svc)[0]['status'] == ('partially_completed' if strategy == 'all' else 'pending')


def test_http_import_to_sandbox_dashboard(tmp_path):
    from fastapi.testclient import TestClient
    from api.main import create_app
    from tests.conftest import make_settings
    from tests.automation_helpers import AUTH
    svc = AutomationService(make_config(tmp_path, mode='sandbox'))
    csv = csv_text(row('2030-10-12 16:00:37').replace('2026-10-13', '2030-10-13'), header=HEADER)
    with TestClient(create_app(make_settings(tmp_path), automation=svc)) as client:
        response = client.post('/api/imports/csv', headers=AUTH['operator'],
                               files={'file': ('exact.csv', csv.encode(), 'text/csv')})
        assert response.status_code == 201, response.text
        assert response.json()['reminders_scheduled'] == 1
        result = client.get('/api/reminders', headers=AUTH['viewer']).json()['reminders'][0]
        assert result['display_status'] == 'scheduled'
        assert result['scheduled_at_utc'] == '2030-10-12T10:30:37Z'
        svc.tick(ist(2030, 10, 12, 16, 0, 37))
        result = client.get('/api/reminders', headers=AUTH['viewer']).json()['reminders'][0]
        assert result['display_status'] == 'simulated'
        dashboard = client.get('/api/automation/dashboard', headers=AUTH['viewer']).json()
        assert dashboard['deliveries_by_channel']['email']['simulated'] == 1
