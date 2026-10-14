#!/usr/bin/env bash
set -e

# Start WhatsApp bridge in background if node is present
if command -v node >/dev/null 2>&1; then
  echo "Starting WhatsApp bridge on port 8005..."
  (cd backend/whatsapp-bridge && if [ ! -d "node_modules" ]; then npm install; fi && PORT=8005 WHATSAPP_BRIDGE_PORT=8005 node server.js) &
  sleep 2
else
  echo "Node.js not found in current container."
fi

# Start FastAPI
cd backend
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"

