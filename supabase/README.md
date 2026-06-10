# Supabase setup

Use this when hosting the frontend on GitHub Pages without the FastAPI backend.

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Wait for the database to finish provisioning.

## 2. Run the schema

**Quick (one file):** paste and run [`setup-all.sql`](./setup-all.sql) in the SQL Editor.

**Or step by step:**

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste and run [`schema.sql`](./schema.sql).
3. Paste and run [`seed-functions.sql`](./seed-functions.sql).
4. Paste and run [`seed.sql`](./seed.sql) to load the tournament roster and fixtures.

See also [`../GO_LIVE.md`](../GO_LIVE.md) and `./scripts/go-live.sh`.

### Or seed later via API (same as FastAPI)

Once you have an admin user signed in, you can call the same operation as `POST /admin/seed-tournament-data`:

**From JavaScript (logged-in admin):**
```ts
await api.seedTournamentData();           // fails if data exists
await api.seedTournamentData(true);       // force: clear + reseed
```

**From curl (replace URL, anon key, and admin JWT):**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/seed_tournament_data' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"force_reseed": false}'
```

Use `"force_reseed": true` to clear and reseed (like `?force=true` on FastAPI).

## 3. Create an admin user

1. Go to **Authentication → Users → Add user**.
2. Create a user with email + password (e.g. `admin@yourcompany.com`).
3. In the SQL editor, register that email as an admin:

```sql
INSERT INTO admins (email, name)
VALUES ('admin@yourcompany.com', 'Tournament Admin');
```

## 4. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Run locally:

```bash
cd frontend
npm install
npm run dev
```

## 5. Deploy to GitHub Pages

In your GitHub repo → **Settings → Secrets and variables → Actions**:

| Name | Type | Value |
|------|------|-------|
| `VITE_SUPABASE_URL` | Variable | Your project URL |
| `VITE_SUPABASE_ANON_KEY` | Secret | Anon public key from Supabase → Settings → API |

Push to `main` — the workflow builds with Supabase env vars baked in.

## FastAPI fallback

To keep using the Python backend locally, set in `.env`:

```
VITE_USE_FASTAPI=true
VITE_API_URL=http://127.0.0.1:8000
```
