# Go Live Checklist

Production stack: **GitHub Pages** (frontend) + **Supabase** (database, auth, gallery). No FastAPI server required.

Live URL: **https://thoughtworks-carrom.github.io/Carrom-Tournament/**

Run the interactive helper:

```bash
chmod +x scripts/go-live.sh
./scripts/go-live.sh
```

---

## Phase 1 — Database

In [Supabase SQL Editor](https://supabase.com/dashboard), run **one file**:

```
supabase/setup-all.sql
```

Or run separately: `schema.sql` → `seed-functions.sql` → `seed.sql`.

**Verify** (Table Editor):

| Table | Expected rows |
|-------|----------------|
| categories | 4 |
| players | 63 |
| groups | 10 |
| matches | hundreds |

**Storage:** bucket named `gallery` should exist (public).

---

## Phase 2 — Admin

1. **Authentication → Users → Add user**
   - Email + password
   - Enable **Auto Confirm User**

2. SQL Editor — edit email in `supabase/admin-setup.sql`, then run it:

```sql
INSERT INTO admins (email, name)
VALUES ('your-email@thoughtworks.com', 'Tournament Admin');
```

---

## Phase 3 — GitHub Pages

**Settings → Secrets and variables → Actions**

| Name | Type |
|------|------|
| `VITE_SUPABASE_URL` | Variable |
| `VITE_SUPABASE_ANON_KEY` | Secret |

Do not set `VITE_USE_FASTAPI`.

**Deploy:** push to `main` (with `frontend/` changes) or **Actions → Deploy frontend to GitHub Pages → Run workflow**.

---

## Phase 4 — Verify

- [ ] Standings show Men's / Women's groups with players
- [ ] Global search finds a player
- [ ] Admin login (pencil icon → email/password)
- [ ] Update a match status/score
- [ ] Upload a gallery image (if upload fails, run `supabase/patches/gallery-storage-fix.sql`)

---

## Local dev

```bash
# frontend/.env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

cd frontend && npm install && npm run dev
```
