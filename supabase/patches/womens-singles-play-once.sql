-- Women's singles: one match per pairing (was two).
-- Safe cleanup: keeps one match per pair (completed > live > oldest scheduled).

CREATE OR REPLACE FUNCTION public.matches_per_pair_for_category(cat_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN 1;
END;
$$;

-- Delete only EXTRA matches per pairing (never all of them).
DELETE FROM matches m
WHERE m.id IN (
  SELECT ranked.id
  FROM (
    SELECT
      m.id,
      ROW_NUMBER() OVER (
        PARTITION BY m.group_id, m.participant1_id, m.participant2_id
        ORDER BY
          CASE m.status
            WHEN 'COMPLETED' THEN 0
            WHEN 'LIVE' THEN 1
            ELSE 2
          END,
          m.created_at,
          m.id
      ) AS rn
    FROM matches m
    JOIN categories c ON c.id = m.category_id
    WHERE c.format = 'SINGLES'
      AND c.gender = 'FEMALE'
  ) ranked
  WHERE ranked.rn > 1
);
