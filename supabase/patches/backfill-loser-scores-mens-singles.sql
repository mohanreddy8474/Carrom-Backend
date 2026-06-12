-- Player IDs
-- Jaya Simha Reddy Nandyala: 893132b4-607c-41cb-ac31-8fcae11d8f13
-- Sharan Reddi:              7601a826-f610-48f3-bc0a-565880ca23ae
-- Narendra Simha Mekala:     589d086e-2d70-49b6-939b-bdc0f44dbfb7
-- Suresh Kolla:               6a8ea634-0972-425a-babb-0de53b649bc7

-- Preview matches (works either participant order)
SELECT m.id AS match_id,
       p1.name || ' vs ' || p2.name AS matchup,
       m.status,
       m.winner_score,
       m.loser_score
FROM matches m
JOIN players p1 ON p1.id = m.participant1_id
JOIN players p2 ON p2.id = m.participant2_id
WHERE (
  (m.participant1_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid
   AND m.participant2_id = '893132b4-607c-41cb-ac31-8fcae11d8f13'::uuid)
  OR (m.participant1_id = '893132b4-607c-41cb-ac31-8fcae11d8f13'::uuid
      AND m.participant2_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid)
  OR (m.participant1_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid
      AND m.participant2_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid)
  OR (m.participant1_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid
      AND m.participant2_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid)
  OR (m.participant1_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid
      AND m.participant2_id = '6a8ea634-0972-425a-babb-0de53b649bc7'::uuid)
  OR (m.participant1_id = '6a8ea634-0972-425a-babb-0de53b649bc7'::uuid
      AND m.participant2_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid)
);

-- Sharan Reddi vs Jaya Simha Reddy Nandyala — loser score 6
UPDATE matches
SET loser_score = 6, updated_at = now()
WHERE (participant1_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid
       AND participant2_id = '893132b4-607c-41cb-ac31-8fcae11d8f13'::uuid)
   OR (participant1_id = '893132b4-607c-41cb-ac31-8fcae11d8f13'::uuid
       AND participant2_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid);

-- Narendra Simha Mekala vs Sharan Reddi — loser score 1
UPDATE matches
SET loser_score = 1, updated_at = now()
WHERE (participant1_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid
       AND participant2_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid)
   OR (participant1_id = '7601a826-f610-48f3-bc0a-565880ca23ae'::uuid
       AND participant2_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid);

-- Narendra Simha Mekala vs Suresh Kolla — loser score 4
UPDATE matches
SET loser_score = 4, updated_at = now()
WHERE (participant1_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid
       AND participant2_id = '6a8ea634-0972-425a-babb-0de53b649bc7'::uuid)
   OR (participant1_id = '6a8ea634-0972-425a-babb-0de53b649bc7'::uuid
       AND participant2_id = '589d086e-2d70-49b6-939b-bdc0f44dbfb7'::uuid);
