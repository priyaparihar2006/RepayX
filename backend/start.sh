#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Only start WhatsApp bridge if explicitly configured
if [ "$WHATSAPP_PROVIDER" = "baileys_bridge" ] && command -v node >/dev/null 2>&1; then
  echo "Starting WhatsApp bridge on port 8005..."
  (
    cd "$REPO_ROOT/backend/whatsapp-bridge" && \
    if [ ! -d "node_modules" ]; then npm install --production; fi && \
    PORT=8005 WHATSAPP_BRIDGE_PORT=8005 node server.js
  ) &
fi

# Start FastAPI backend
cd "$REPO_ROOT/backend"
echo "Starting FastAPI on 0.0.0.0:${PORT:-8000}..."
exec python run.py
