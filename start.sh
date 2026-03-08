#!/bin/bash
set -e

# ──────────────────────────────────────────────────
# Unified start script — Python backend + Next.js
# ──────────────────────────────────────────────────

# Configurable ports (override via environment variables)
PORT="${PORT:-3001}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

# Start Python backend in the background
echo "Starting crop-suggestion backend on port ${BACKEND_PORT}…"
cd backend
python3 -m uvicorn app:app --host 127.0.0.1 --port "$BACKEND_PORT" &
BACKEND_PID=$!
cd ..

# Cleanup: kill the backend when this script exits (Ctrl-C, SIGTERM, etc.)
trap "kill $BACKEND_PID 2>/dev/null; wait $BACKEND_PID 2>/dev/null" EXIT INT TERM

# Wait for the backend to become healthy (up to 30 seconds)
echo "Waiting for crop backend to be ready…"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
    echo "Backend ready (took ${i}s)."
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend process died. Check backend/app.py logs." >&2
    exit 1
  fi
  sleep 1
done

# Final health check
if ! curl -sf http://127.0.0.1:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
  echo "WARNING: Backend did not become healthy within 30s. Starting Next.js anyway…" >&2
fi

# Start Next.js production server (foreground)
if [ -f ".next/standalone/server.js" ]; then
  echo "Starting Next.js standalone server on port ${PORT}…"
  HOSTNAME=127.0.0.1 PORT="$PORT" node .next/standalone/server.js
else
  echo "Starting Next.js production server on port ${PORT}…"
  npx next start -p "$PORT"
fi
