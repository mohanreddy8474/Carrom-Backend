-- Tournament seed data — run AFTER schema.sql + seed-functions.sql
-- Equivalent to POST /admin/seed-tournament-data on an empty FastAPI database.

SELECT apply_tournament_seed();

-- Register your admin email (create matching user in Supabase Auth → Users)
-- INSERT INTO admins (email, name) VALUES ('you@thoughtworks.com', 'Tournament Admin');
