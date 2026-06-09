#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

pip install -q -r requirements.txt

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "Starting server at http://127.0.0.1:8000"
echo "API docs: http://127.0.0.1:8000/docs"
exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
