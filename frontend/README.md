# Thoughtworks Hyderabad Carrom Tournament 2026

A modern single-page React website for the internal office Carrom tournament.

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS (dark/light mode)
- Framer Motion animations
- Lucide React icons

## Features

- Sections: Hero, Categories, Rules, Scoring, **Standings** (category → groups → points & schedule), Info, Gallery, Footer
- **Category-first layout**: Singles/Doubles tabs, each with separate groups
- **Per-group points** (not combined across groups)
- **Round-robin schedules**: every player plays everyone in their group
- Countdown timer, live match highlight, coming soon banner
- Global search across players, groups, and matches
- **Admin mode** (pencil icon): edit points, players, and match status per group — saved to `localStorage`
- No backend or authentication required

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Admin Usage

1. Click the **edit icon** in the navbar to enable Admin Mode.
2. Pick a category tab, then edit group points, player names, and match status in that group.
3. Use **Regenerate round-robin** after changing player lists to rebuild the full group schedule.
4. Changes auto-save to the browser. Use **Reset Sample Data** to restore mock defaults.

## Supabase Integration (optional — recommended for multi-user use)

This project ships as a frontend-only Vite app with localStorage-backed admin mode. To run a multi-user production-ready system you can connect it to Supabase (Postgres + Auth).

Steps to enable Supabase back-end:

1. Create a Supabase project at https://app.supabase.com.
2. In the Supabase SQL editor, paste and run the schema file: `supabase/schema.sql`.
3. Insert an admin user into the `admins` table (replace email):

```sql
insert into admins (email, name) values ('admin@example.com', 'Tournament Admin');
```

4. Go to Project Settings → API and copy the Project URL and anon public key.
5. Create a `.env` (or Vercel project env) from `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIU...
```

6. The app includes a Supabase client at `src/lib/supabase.ts`. Use `supabase.auth` to implement sign-in for admins and use row-level security (RLS) so only admins can modify tournament data while others have read-only access.

Security hints:
- The `supabase/schema.sql` contains suggested RLS policy snippets and a helper `is_admin()` function that relies on JWT claim email. Adjust according to how you manage auth and claims.
- Never commit your service role key to the repo. Use it only in server-side contexts (migrations, scheduled jobs).

Next steps (recommended):
- Implement admin sign-in UI using Supabase Auth and wire updates to the real tables instead of localStorage.
- Add server-side functions or Supabase Edge Functions to perform fixture generation and standings recalculation atomically.
- For Vercel deployment, set the VITE_SUAPBASE_* env vars in the Vercel project settings.


Registration happens outside this site (as noted on category cards).
