-- Run AFTER creating the user in Supabase Auth (Authentication → Users → Add user)
-- Replace the email below with your admin's login email.

INSERT INTO admins (email, name)
VALUES ('admin@yourcompany.com', 'Tournament Admin')
ON CONFLICT (email) DO NOTHING;
