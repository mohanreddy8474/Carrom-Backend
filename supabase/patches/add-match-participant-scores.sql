-- Run once: add optional loser_score to matches (winner_score stays as-is).

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS loser_score integer;

CREATE OR REPLACE FUNCTION public.validate_match_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_status match_status;
BEGIN
  IF NEW.status = 'SCHEDULED'
     AND NEW.winner_participant_id IS NULL
     AND NEW.winner_score IS NULL
     AND NEW.loser_score IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Winner locked on completed matches; loser_score may be filled in later via SQL
  IF OLD.status = 'COMPLETED' AND NEW.status = 'COMPLETED' THEN
    IF NEW.winner_participant_id IS DISTINCT FROM OLD.winner_participant_id
       OR NEW.winner_score IS DISTINCT FROM OLD.winner_score THEN
      RAISE EXCEPTION 'Winner cannot be modified for completed matches';
    END IF;
  END IF;

  v_new_status := COALESCE(NEW.status, OLD.status);

  IF (NEW.winner_participant_id IS DISTINCT FROM OLD.winner_participant_id
      OR NEW.winner_score IS DISTINCT FROM OLD.winner_score)
     AND v_new_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Winner information can only be set when status is COMPLETED';
  END IF;

  IF NEW.loser_score IS DISTINCT FROM OLD.loser_score
     AND v_new_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'loser_score can only be set when status is COMPLETED';
  END IF;

  IF v_new_status = 'COMPLETED' THEN
    IF NEW.winner_participant_id IS NULL OR NEW.winner_score IS NULL THEN
      RAISE EXCEPTION 'winner_participant_id and winner_score are required for COMPLETED matches';
    END IF;

    IF NEW.winner_participant_id NOT IN (NEW.participant1_id, NEW.participant2_id) THEN
      RAISE EXCEPTION 'winner_participant_id must be one of the match participants';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_all_match_results()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE matches
  SET status = 'SCHEDULED',
      winner_participant_id = NULL,
      winner_score = NULL,
      loser_score = NULL,
      updated_at = now()
  WHERE status IN ('COMPLETED', 'LIVE')
     OR winner_participant_id IS NOT NULL
     OR winner_score IS NOT NULL
     OR loser_score IS NOT NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
