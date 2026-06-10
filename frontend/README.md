# Thoughtworks Hyderabad Carrom Tournament 2026

A modern single-page React website for the internal office Carrom tournament.

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS (dark/light mode)
- Framer Motion animations
- **Supabase** (Postgres + Auth + Storage) — production / GitHub Pages
- **FastAPI** (optional) — local backend fallback

## Features

- Category-first standings with per-group points and round-robin schedules
- Live match highlight, global search, gallery
- Admin mode: manage players, teams, groups, match scores
- Fixture generation and match validation handled in Supabase (triggers) or FastAPI

## Getting Started (Supabase — recommended)

See [`../supabase/README.md`](../supabase/README.md) for full setup.

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Admin login uses **email + password** (Supabase Auth user registered in the `admins` table).

## Getting Started (FastAPI fallback)

```bash
# In .env:
# VITE_USE_FASTAPI=true
# VITE_API_URL=http://127.0.0.1:8000

npm install
npm run dev
```

Start the Python backend separately (`./run-all.sh` or `uvicorn`).

Admin login uses the **organizer secret key** (`ADMIN_SECRET` on the server).

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

Set repository Actions variables/secrets — see `supabase/README.md`.
