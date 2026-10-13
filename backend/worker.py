"""Run the reminder worker as its own long-lived process.

    cd backend
    python worker.py

It claims due jobs from the database, so it keeps working when no browser is open
and picks up where it left off after a restart. Stop it with Ctrl+C or SIGTERM.
"""

from __future__ import annotations

import logging
import signal
from pathlib import Path

import env_loader

if __name__ == "__main__":
    env_loader.load_environment()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    from automation.service import AutomationService

    service = AutomationService()

    def _shutdown(*_):
        service._stop.set()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)
    service.run_forever()
