#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Start WhatsApp bridge in background if node is present
if command -v node >/dev/null 2>&1; then
  echo "Starting WhatsApp bridge on port 8005..."
  (
    cd "$REPO_ROOT/backend/whatsapp-bridge" && \
    if [ ! -d "node_modules" ]; then npm install --production; fi && \
    PORT=8005 WHATSAPP_BRIDGE_PORT=8005 node server.js
  ) &
  sleep 2
else
  echo "Node.js not found in current environment (WhatsApp bridge skipped)."
fi

# Start FastAPI backend
cd "$REPO_ROOT/backend"
echo "Starting FastAPI on port ${PORT:-8000}..."
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
