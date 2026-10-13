"""Real-clock acceptance check: isolated sandbox, actual worker.py, no browser/API.

Run from backend: .venv/Scripts/python.exe scripts/verify_exact_worker.py
Takes about 150 seconds. No project database or external recipient is used.
"""
from __future__ import annotations

import argparse
from dataclasses import replace
from datetime import timedelta
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from zoneinfo import ZoneInfo

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from automation.config import AutomationConfig
from automation.service import AutomationService
from automation.util import iso, parse_iso, utcnow
from api.routes_automation import _job_public


def verify(output: Path | None = None) -> dict:
    with tempfile.TemporaryDirectory(prefix='repayx-exact-') as folder:
        db = Path(folder) / 'test.sqlite3'
        config = replace(AutomationConfig(), db_path=db, mode='sandbox', poll_seconds=1)
        svc = AutomationService(config)
        # This only changes the disposable test database, never the real policy.
        svc.policy.update({'contact_window_start': '00:00', 'contact_window_end': '23:59'}, 'sandbox-test')
        now = utcnow()
        target = (now + timedelta(seconds=150)).replace(microsecond=0)
        local = target.astimezone(ZoneInfo('Asia/Kolkata'))
        if local.hour == 23 and local.minute == 59:
            raise RuntimeError('Run again after midnight IST to stay within the test contact window.')
        csv = ('customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,timezone\n'
               f'CLOCK-TEST,Sandbox Clock Test,+12025550123,clock@example.invalid,CLOCK-LOAN,100,{local.date()},'
               f'{local:%Y-%m-%d %H:%M:%S},all,Asia/Kolkata\n')
        result = svc.importer.run(csv.encode(), 'clock.csv', 'sandbox-test', svc.policy.get(), now)
        assert result.reconcile.scheduled == 1, result.as_dict()
        duplicate = svc.importer.run(csv.encode(), 'clock.csv', 'sandbox-test', svc.policy.get(), utcnow())
        assert duplicate.unchanged_rows == 1 and duplicate.reconcile.scheduled == 0
        env = {**os.environ, 'AUTOMATION_MODE': 'sandbox', 'AUTOMATION_DB_PATH': str(db),
               'DATABASE_URL': f'sqlite:///{db.as_posix()}', 'SCHEDULER_POLL_SECONDS': '1',
               'PYTHONPATH': str(BACKEND), 'SCHEDULER_EMBEDDED': 'false'}
        log_path = Path(folder) / 'worker.log'
        def start(log):
            return subprocess.Popen([sys.executable, 'worker.py'], cwd=BACKEND, env=env,
                                    stdout=log, stderr=subprocess.STDOUT,
                                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        def stop(proc):
            # Windows venv python.exe may be a launcher with a child interpreter.
            # Terminate that specific process tree so no worker survives this test.
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'],
                               check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                               creationflags=subprocess.CREATE_NO_WINDOW)
            else:
                proc.terminate()
            proc.wait(timeout=15)
        def snapshot():
            with svc.db.read() as conn:
                job = dict(conn.execute('SELECT * FROM reminder_jobs').fetchone())
                ds = [dict(d) for d in conn.execute('SELECT * FROM message_deliveries')]
                beats = conn.execute('SELECT COUNT(*) FROM worker_heartbeats').fetchone()[0]
            return job, ds, beats
        with log_path.open('w') as log:
            proc = start(log)
            try:
                deadline = time.monotonic() + 20
                while snapshot()[2] == 0 and time.monotonic() < deadline:
                    assert proc.poll() is None, 'Worker exited before heartbeat'
                    time.sleep(0.2)
                assert snapshot()[2] == 1
                assert snapshot()[0]['status'] == 'pending' and not snapshot()[1]
            finally:
                stop(proc)
            print(f'Scheduled {iso(target)} / {local.isoformat()}; restarting worker before due time.', flush=True)
            proc = start(log)
            try:
                deadline = time.monotonic() + 180
                while time.monotonic() < deadline:
                    assert proc.poll() is None, 'Worker exited unexpectedly'
                    observed_at = utcnow()
                    job, ds, beats = snapshot()
                    if observed_at < target - timedelta(seconds=1):
                        assert job['status'] == 'pending' and not ds, 'Executed before scheduled time'
                    if job['status'] == 'completed':
                        break
                    time.sleep(0.2)
                assert job['status'] == 'completed', job
                assert beats == 2, 'Restarted worker did not heartbeat'
                assert len(ds) == 3
                assert all(d['provider'] == 'sandbox' and d['status'] == 'accepted' for d in ds)
                assert all(d['delivered_at'] is None and d['attempt_count'] == 1 for d in ds)
                assert all(parse_iso(d['accepted_at']) >= target for d in ds)
                assert parse_iso(job['completed_at']) >= target
                public = _job_public(job, ds)
                assert public['display_status'] == 'simulated'
                evidence = {'scheduled_utc': job['scheduled_at_utc'], 'scheduled_ist': local.isoformat(),
                            'executed_utc': job['completed_at'], 'observed_utc': iso(utcnow()),
                            'final_status': public['display_status'], 'queue_status': job['status'],
                            'worker_processes': beats, 'job_attempts': job['attempt_count'],
                            'browser_or_api_running': False, 'duplicate_jobs': 0,
                            'deliveries': [{k: d[k] for k in ('channel', 'provider', 'status', 'accepted_at',
                                                             'delivered_at', 'attempt_count')} for d in ds]}
            finally:
                stop(proc)
        if output:
            output.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(evidence, indent=2), flush=True)
        return evidence


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    verify(parser.parse_args().output)
