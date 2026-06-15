-- Restore women's singles fixtures after the bad cleanup deleted all scheduled pairs.
-- Safe to run multiple times: only creates missing matches (one per pairing).

CREATE OR REPLACE FUNCTION public.matches_per_pair_for_category(cat_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN 1;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT gp.group_id, gp.player_id
    FROM group_players gp
    JOIN groups g ON g.id = gp.group_id
    JOIN categories c ON c.id = g.category_id
    WHERE c.format = 'SINGLES'
      AND c.gender = 'FEMALE'
  LOOP
    PERFORM generate_fixtures_for_participant(r.group_id, r.player_id, 'PLAYER');
  END LOOP;
END $$;
