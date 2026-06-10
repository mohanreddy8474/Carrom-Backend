#!/usr/bin/env bash
# Go-live helper for Supabase + GitHub Pages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Carrom Tournament — Go Live ==="
echo ""

# ── 1. Supabase SQL ──────────────────────────────────────────────────────────
echo "Step 1: Supabase database"
if [[ -n "${SUPABASE_DB_URL:-}" ]] && command -v psql &>/dev/null; then
  echo "  Running setup-all.sql via psql..."
  psql "$SUPABASE_DB_URL" -f supabase/setup-all.sql
  echo "  Done."
else
  echo "  Option A — SQL Editor (recommended):"
  echo "    1. Open Supabase Dashboard → SQL Editor"
  echo "    2. Paste and run: supabase/setup-all.sql"
  echo ""
  echo "  Option B — psql (if you have the DB connection string):"
  echo "    export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@...'"
  echo "    ./scripts/go-live.sh"
fi
echo ""

# ── 2. Admin ─────────────────────────────────────────────────────────────────
echo "Step 2: Admin user"
echo "  1. Supabase → Authentication → Users → Add user (enable Auto Confirm)"
echo "  2. Edit supabase/admin-setup.sql with your email, then run in SQL Editor"
echo ""

# ── 3. Local env ─────────────────────────────────────────────────────────────
echo "Step 3: Local frontend/.env"
if [[ ! -f frontend/.env ]] || ! grep -q VITE_SUPABASE_URL frontend/.env 2>/dev/null; then
  cat > frontend/.env <<'ENVEOF'
# Supabase (production + local dev)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# FastAPI fallback (optional local dev)
# VITE_USE_FASTAPI=true
# VITE_API_URL=http://127.0.0.1:8000
ENVEOF
  echo "  Created frontend/.env — edit with your Supabase URL and anon key."
else
  echo "  frontend/.env already has VITE_SUPABASE_URL."
fi
echo ""

# ── 4. GitHub Actions ────────────────────────────────────────────────────────
echo "Step 4: GitHub Actions (repo: thoughtworks-carrom/Carrom-Tournament)"
echo "  Settings → Secrets and variables → Actions:"
echo "    Variable  VITE_SUPABASE_URL      = https://YOUR_PROJECT.supabase.co"
echo "    Secret    VITE_SUPABASE_ANON_KEY = (anon key from Supabase → Settings → API)"
echo ""
if command -v gh &>/dev/null; then
  read -r -p "  Set GitHub variables now with gh? [y/N] " ans
  if [[ "${ans,,}" == "y" ]]; then
    read -r -p "  VITE_SUPABASE_URL: " sb_url
    read -r -s -p "  VITE_SUPABASE_ANON_KEY: " sb_key
    echo ""
    gh variable set VITE_SUPABASE_URL --body "$sb_url" -R thoughtworks-carrom/Carrom-Tournament
    gh secret set VITE_SUPABASE_ANON_KEY --body "$sb_key" -R thoughtworks-carrom/Carrom-Tournament
    echo "  GitHub env configured."
  fi
else
  echo "  Install gh CLI to set vars automatically, or set them in the GitHub UI."
fi
echo ""

# ── 5. Deploy ────────────────────────────────────────────────────────────────
echo "Step 5: Deploy"
echo "  Push to main (frontend/ changes), or run workflow manually:"
echo "    GitHub → Actions → Deploy frontend to GitHub Pages → Run workflow"
echo ""
echo "  Live URL: https://thoughtworks-carrom.github.io/Carrom-Tournament/"
echo ""
echo "Step 6: Verify — standings load, admin login, match update, gallery upload"
echo "=== Done ==="
