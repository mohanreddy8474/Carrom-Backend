-- Seed helpers — run AFTER schema.sql
-- Provides the same behaviour as POST /admin/seed-tournament-data on FastAPI

CREATE OR REPLACE FUNCTION public.clear_tournament_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM matches;
  DELETE FROM group_players;
  DELETE FROM group_teams;
  DELETE FROM groups;
  DELETE FROM teams;
  DELETE FROM players;
  DELETE FROM categories;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_tournament_seed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO categories (name, gender, format) VALUES
    ('Men''s Singles', 'MALE', 'SINGLES'),
    ('Women''s Singles', 'FEMALE', 'SINGLES'),
    ('Men''s Doubles', 'MALE', 'DOUBLES'),
    ('Mixed Doubles', 'MIXED', 'DOUBLES')
  ON CONFLICT (gender, format) DO NOTHING;

  INSERT INTO players (name, employee_id, gender) VALUES
    ('Raju Reddy', '19024', 'MALE'),
    ('Medida Teja', '24425', 'MALE'),
    ('Chakravarthi', '25926', 'MALE'),
    ('Surya Borusu', '28548', 'MALE'),
    ('Pavan Posannapeta', '29143', 'MALE'),
    ('Pavan Andhukuri', '30916', 'MALE'),
    ('Srikanth Nelluri', '31133', 'MALE'),
    ('K Raghavendra', '31649', 'MALE'),
    ('Sree Lekha', '33566', 'FEMALE'),
    ('Bharath Balla', '35810', 'MALE'),
    ('Vivek Alladi', '38312', 'MALE'),
    ('Amrutha M', '38302', 'FEMALE'),
    ('Anusha Palle', '39130', 'FEMALE'),
    ('Mani Kumar Reddy Kancharla', '39592', 'MALE'),
    ('Lakshmi Prasanna', '40885', 'FEMALE'),
    ('SVS Maruthi', '41018', 'MALE'),
    ('Akhil Charugondla', '41213', 'MALE'),
    ('Yamuna Kadava', '41443', 'FEMALE'),
    ('Gopichand G', '42190', 'MALE'),
    ('Eshwar Baddam', '42193', 'MALE'),
    ('Jaya Simha Reddy Nandyala', '42390', 'MALE'),
    ('Sai Srinivas Marem', '42543', 'MALE'),
    ('Prateek Gupta', '42558', 'MALE'),
    ('Sudhir Batham', '42728', 'MALE'),
    ('Pulkit Kumar', '42746', 'MALE'),
    ('Maheshkumar Boga', '42906', 'MALE'),
    ('Hemanth Sri Sai Boodi', '43290', 'MALE'),
    ('Narendra Simha Mekala', '43310', 'MALE'),
    ('Sasidhar Challa', '43702', 'MALE'),
    ('Krishna Teja', '43858', 'MALE'),
    ('Divakar Rayapudi', '43871', 'MALE'),
    ('Sita Sowmya Paluri', '43876', 'FEMALE'),
    ('Janardhan P', '43883', 'MALE'),
    ('Rohan Mogadampally', '44026', 'MALE'),
    ('Sagar Babu', '44220', 'MALE'),
    ('Ashay Kumar', '44290', 'MALE'),
    ('Huzaifa', '44320', 'MALE'),
    ('Naveen Gudla', '44480', 'MALE'),
    ('Rasmith Patnaik Arasada', '44501', 'MALE'),
    ('Gadikoya Chandra Reddy', '44526', 'MALE'),
    ('Mohd Aquib Shakeel', '44528', 'MALE'),
    ('Chandrasekhar Raju', '44854', 'MALE'),
    ('Sai Akhil Allam', '44963', 'MALE'),
    ('Bolem Poorna Rama Satya Chandu', '45062', 'MALE'),
    ('Sharan Reddi', '45142', 'MALE'),
    ('Lochan Sindunoori', '45246', 'MALE'),
    ('Ravi Kiran Yasa', '45274', 'MALE'),
    ('Praneeth Andukuri', '45389', 'MALE'),
    ('Rohini Priyamvada K', '45390', 'FEMALE'),
    ('Batta Malleswari', '45400', 'FEMALE'),
    ('Prashanth Charla', '45845', 'MALE'),
    ('Chaitanya Kumar', '45938', 'MALE'),
    ('Bhargav Potnuri', '45988', 'MALE'),
    ('Varun Manireddy', '46235', 'MALE'),
    ('Shiva Chaudhari', '46774', 'MALE'),
    ('Vishnu M', '46805', 'MALE'),
    ('Sai Mohan Reddy', '46882', 'MALE'),
    ('Supriya Karindi', '47492', 'FEMALE'),
    ('Suresh Kolla', '48370', 'MALE'),
    ('Dinesh Jampani', '48384', 'MALE'),
    ('Swetha SS', '48474', 'FEMALE'),
    ('Nagendra Babu Marasu', '42490', 'MALE'),
    ('Garlapati Praveen', '44606', 'MALE');

  INSERT INTO groups (category_id, name)
  SELECT c.id, g.name
  FROM categories c
  CROSS JOIN (VALUES
    ('Group A'), ('Group B'), ('Group C'), ('Group D'),
    ('Group E'), ('Group F'), ('Group G'), ('Group H')
  ) AS g(name)
  WHERE c.name = 'Men''s Singles'
  ON CONFLICT (category_id, name) DO NOTHING;

  INSERT INTO groups (category_id, name)
  SELECT c.id, g.name
  FROM categories c
  CROSS JOIN (VALUES ('Group W-A'), ('Group W-B')) AS g(name)
  WHERE c.name = 'Women''s Singles'
  ON CONFLICT (category_id, name) DO NOTHING;

  INSERT INTO group_players (group_id, player_id, group_position)
  SELECT g.id, p.id, x.pos
  FROM (VALUES
    ('Group A', '29143', 1), ('Group A', '42728', 2), ('Group A', '35810', 3),
    ('Group A', '46235', 4), ('Group A', '43883', 5), ('Group A', '43871', 6), ('Group A', '43290', 7),
    ('Group B', '46882', 1), ('Group B', '19024', 2), ('Group B', '31649', 3),
    ('Group B', '48384', 4), ('Group B', '42193', 5), ('Group B', '45062', 6), ('Group B', '45274', 7),
    ('Group C', '44480', 1), ('Group C', '24425', 2), ('Group C', '45845', 3),
    ('Group C', '43702', 4), ('Group C', '44526', 5), ('Group C', '44320', 6), ('Group C', '42490', 7),
    ('Group D', '44963', 1), ('Group D', '28548', 2), ('Group D', '44290', 3),
    ('Group D', '42190', 4), ('Group D', '42558', 5), ('Group D', '39592', 6), ('Group D', '44854', 7),
    ('Group E', '45988', 1), ('Group E', '43310', 2), ('Group E', '45938', 3),
    ('Group E', '45389', 4), ('Group E', '48370', 5), ('Group E', '45142', 6), ('Group E', '42390', 7),
    ('Group F', '44606', 1), ('Group F', '44501', 2), ('Group F', '42746', 3),
    ('Group F', '45246', 4), ('Group F', '41018', 5), ('Group F', '42543', 6),
    ('Group G', '44026', 1), ('Group G', '25926', 2), ('Group G', '31133', 3),
    ('Group G', '41213', 4), ('Group G', '44528', 5), ('Group G', '44220', 6),
    ('Group H', '42906', 1), ('Group H', '30916', 2), ('Group H', '46805', 3),
    ('Group H', '43858', 4), ('Group H', '38312', 5), ('Group H', '46774', 6)
  ) AS x(group_name, emp_id, pos)
  JOIN groups g ON g.name = x.group_name
  JOIN categories c ON c.id = g.category_id AND c.name = 'Men''s Singles'
  JOIN players p ON p.employee_id = x.emp_id
  ON CONFLICT (group_id, player_id) DO NOTHING;

  INSERT INTO group_players (group_id, player_id, group_position)
  SELECT g.id, p.id, x.pos
  FROM (VALUES
    ('Group W-A', '33566', 1), ('Group W-A', '38302', 2), ('Group W-A', '39130', 3),
    ('Group W-A', '47492', 4), ('Group W-A', '48474', 5),
    ('Group W-B', '40885', 1), ('Group W-B', '41443', 2), ('Group W-B', '43876', 3),
    ('Group W-B', '45390', 4), ('Group W-B', '45400', 5)
  ) AS x(group_name, emp_id, pos)
  JOIN groups g ON g.name = x.group_name
  JOIN categories c ON c.id = g.category_id AND c.name = 'Women''s Singles'
  JOIN players p ON p.employee_id = x.emp_id
  ON CONFLICT (group_id, player_id) DO NOTHING;
END;
$$;

-- Same as POST /admin/seed-tournament-data?force=true|false (admin JWT required)
CREATE OR REPLACE FUNCTION public.seed_tournament_data(force_reseed boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_counts jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
    IF NOT force_reseed THEN
      RAISE EXCEPTION 'Database already has data. Pass force_reseed=true to clear and reseed.';
    END IF;
    PERFORM clear_tournament_data();
  END IF;

  PERFORM apply_tournament_seed();

  SELECT jsonb_build_object(
    'categories', (SELECT count(*)::int FROM categories),
    'groups', (SELECT count(*)::int FROM groups),
    'players', (SELECT count(*)::int FROM players),
    'teams', (SELECT count(*)::int FROM teams),
    'group_players', (SELECT count(*)::int FROM group_players),
    'group_teams', (SELECT count(*)::int FROM group_teams),
    'matches', (SELECT count(*)::int FROM matches)
  ) INTO result_counts;

  RETURN jsonb_build_object(
    'message', 'Tournament data loaded successfully.',
    'counts', result_counts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_tournament_seed() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.seed_tournament_data(boolean) TO authenticated;
