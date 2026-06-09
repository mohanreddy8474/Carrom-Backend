#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cleanup() {
  echo ""
  echo "Stopping backend and frontend..."
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting Carrom Tournament stack..."
echo "  Backend:  http://127.0.0.1:8000  (API docs: /docs)"
echo "  Frontend: http://127.0.0.1:5173"
echo "Press Ctrl+C to stop both."
echo ""

./run.sh &
BACKEND_PID=$!

./frontend/run.sh &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
