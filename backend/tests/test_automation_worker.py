"""The worker runs on its own: real clock, no API calls, no dashboard."""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
import time
from datetime import timedelta
from pathlib import Path

from automation.util import utcnow
from tests.automation_helpers import HEADER, csv_text, import_csv, jobs, make_service

BACKEND = Path(__file__).resolve().parents[1]


def _row_due_in(seconds: int, tz: str = "UTC") -> str:
    at = utcnow() + timedelta(seconds=seconds)
    # Explicit reminder in UTC so the test is independent of the machine's timezone.
    return (f"CUST-RT,Real Time,9876500999,,LN-RT,100,{(at + timedelta(days=2)).date()},pending,,"
            f"{at.date()},{at.strftime('%H:%M')},{tz},yes,yes,yes,en,granted")


def test_background_worker_sends_at_the_scheduled_minute_without_any_request(tmp_path):
    svc = make_service(tmp_path, poll_seconds=1)
    svc.policy.update({"contact_window_start": "00:00", "contact_window_end": "23:59"}, "test")
    now = utcnow()
    target_minute = (now + timedelta(minutes=1)).replace(second=0, microsecond=0)
    seconds_to_wait = (target_minute - now).total_seconds()
    import_csv(svc, csv_text(_row_due_in(int(seconds_to_wait) + 1)), now)
    [job] = jobs(svc)
    assert job["status"] == "pending"

    svc.start_background()
    try:
        deadline = time.monotonic() + seconds_to_wait + 10
        while time.monotonic() < deadline and jobs(svc)[0]["status"] == "pending":
            time.sleep(0.5)
    finally:
        svc.stop()
    assert jobs(svc)[0]["status"] == "completed"
    assert len(svc.providers["whatsapp"].sent) == 1


def test_standalone_worker_process_starts_heartbeats_and_stops(tmp_path):
    db = tmp_path / "worker.sqlite3"
    env = {**os.environ, "AUTOMATION_DB_PATH": str(db), "AUTOMATION_MODE": "sandbox", "SCHEDULER_POLL_SECONDS": "1",
           "PYTHONPATH": str(BACKEND)}
    proc = subprocess.Popen([sys.executable, "worker.py"], cwd=BACKEND, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        deadline = time.monotonic() + 20
        beat = None
        while time.monotonic() < deadline:
            if db.exists():
                try:
                    with sqlite3.connect(db) as conn:
                        beat = conn.execute("SELECT last_tick_at FROM worker_heartbeats").fetchone()
                except sqlite3.OperationalError:
                    beat = None
                if beat:
                    break
            time.sleep(0.5)
        assert beat is not None, "worker never wrote a heartbeat"
    finally:
        proc.terminate()
        proc.wait(timeout=15)
