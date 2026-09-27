-- Existing-database-safe seed for 100 varied FitKit demo members.
-- This file is intentionally rerunnable and is applied after platform.sql.

SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1));

WITH demo AS (
    SELECT
        n,
        first_names[((n - 1) % array_length(first_names, 1)) + 1] AS first_name,
        last_names[(((n - 1) / array_length(first_names, 1))::INT % array_length(last_names, 1)) + 1] AS last_name,
        country_codes[((n - 1) % array_length(country_codes, 1)) + 1] AS country_id
    FROM generate_series(1, 100) AS series(n)
    CROSS JOIN (SELECT ARRAY[
        'Aisha','Liam','Sofia','Noah','Maya','Ethan','Priya','Lucas','Hana','Oliver',
        'Nadia','Mateo','Emma','Arif','Chloe','Daniel','Yuki','Amara','Leo','Fatima'
    ]::TEXT[] AS first_names) f
    CROSS JOIN (SELECT ARRAY[
        'Rahman','Carter','Silva','Ahmed','Patel','Kim','Tanaka','Muller','Smith','Khan',
        'Brown','Sato','Wilson','Garcia','Das','Martin','Ali','Johnson','Naidoo','Roy'
    ]::TEXT[] AS last_names) l
    CROSS JOIN (SELECT ARRAY['BD','US','UK','CA','AU','JP','DE','BR','IN','ZA']::CHAR(2)[] AS country_codes) c
)
INSERT INTO users (
    name, email, password_hash, phone_no, gender, birth_date, height_cm,
    weight_kg, fitness_level, primary_goal, country_id, default_privacy, created_at
)
SELECT
    first_name || ' ' || last_name,
    LOWER(first_name || '.' || last_name || LPAD(n::TEXT, 3, '0') || '@fitkit.com'),
    '$2b$10$dYTMSr/fWUU63II61XowouX1lBr5.08Qh06bC7PjbUaJ7O2RUOisS',
    '+8801' || LPAD((700000000 + n)::TEXT, 9, '0'),
    CASE WHEN n % 2 = 0 THEN 'Male' ELSE 'Female' END,
    (DATE '1984-01-01' + ((n * 173) % 7300))::DATE,
    (150 + (n * 7 % 46))::NUMERIC(5,2),
    (48 + (n * 11 % 53))::NUMERIC(5,2),
    (ARRAY['Beginner','Intermediate','Advanced'])[((n - 1) % 3) + 1],
    (ARRAY['Weight Loss','Muscle Gain','Strength','Flexibility','General Fitness'])[((n - 1) % 5) + 1],
    country_id,
    (ARRAY['Public','Friends','Private'])[((n - 1) % 3) + 1],
    CURRENT_TIMESTAMP - ((30 + n * 12) || ' days')::INTERVAL
FROM demo
ON CONFLICT (email) DO NOTHING;

INSERT INTO Member (user_id, daily_step_goal, daily_calorie_goal, daily_hydration_goal, is_rest_mode)
SELECT user_id, 6000 + (user_id % 9) * 1000, 500 + (user_id % 8) * 100,
       1800 + (user_id % 9) * 200, user_id % 17 = 0
FROM users
WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id) DO NOTHING;

WITH demo_users AS (
    SELECT user_id FROM users
    WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
), exercises AS (
    SELECT exercise_id, ROW_NUMBER() OVER (ORDER BY exercise_id) AS position
    FROM Exercise WHERE is_active = TRUE
    ORDER BY exercise_id LIMIT 5
), exercise_count AS (
    SELECT COUNT(*)::INT AS total FROM exercises
)
INSERT INTO WorkoutEntry (user_id, exercise_id, logged_at, quantity, is_public)
SELECT users.user_id, exercise.exercise_id,
       CURRENT_TIMESTAMP - ((history.week_no * 7 + users.user_id % 6) || ' days')::INTERVAL,
       8 + ((users.user_id * 3 + history.week_no * 5) % 43),
       (users.user_id + history.week_no) % 3 = 0
FROM demo_users users
CROSS JOIN generate_series(1, 12) AS history(week_no)
CROSS JOIN exercise_count count
JOIN exercises exercise
  ON exercise.position = 1 + ((users.user_id + history.week_no) % count.total)
WHERE count.total > 0
  AND NOT EXISTS (
      SELECT 1 FROM WorkoutEntry existing
      WHERE existing.user_id = users.user_id
        AND existing.logged_at::DATE = CURRENT_DATE - (history.week_no * 7 + users.user_id % 6)
  );

INSERT INTO StepEntry (user_id, logged_at, steps_added, is_public)
SELECT users.user_id, CURRENT_TIMESTAMP - (history.day_no || ' days')::INTERVAL,
       3500 + ((users.user_id * 613 + history.day_no * 977) % 12501),
       (users.user_id + history.day_no) % 4 = 0
FROM users
CROSS JOIN generate_series(1, 30) AS history(day_no)
WHERE users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (
      SELECT 1 FROM StepEntry existing
      WHERE existing.user_id = users.user_id
        AND existing.logged_at::DATE = CURRENT_DATE - history.day_no
  );

INSERT INTO HydrationEntry (user_id, logged_at, amount_ml, is_public)
SELECT users.user_id, CURRENT_TIMESTAMP - (history.day_no || ' days')::INTERVAL,
       1200 + ((users.user_id * 137 + history.day_no * 211) % 2601), FALSE
FROM users
CROSS JOIN generate_series(1, 30) AS history(day_no)
WHERE users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (
      SELECT 1 FROM HydrationEntry existing
      WHERE existing.user_id = users.user_id
        AND existing.logged_at::DATE = CURRENT_DATE - history.day_no
  );

WITH achievements AS (
    SELECT achievement_id, ROW_NUMBER() OVER (ORDER BY achievement_id) AS position
    FROM Achievement ORDER BY achievement_id LIMIT 3
)
INSERT INTO MemberAchievement (user_id, achievement_id, earned_date)
SELECT users.user_id, achievements.achievement_id,
       CURRENT_TIMESTAMP - ((users.user_id % 90 + achievements.position * 3) || ' days')::INTERVAL
FROM users
JOIN achievements ON achievements.position <= 1 + (users.user_id % 3)
WHERE users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

WITH plans AS (
    SELECT plan_id, ROW_NUMBER() OVER (ORDER BY plan_id) AS position
    FROM WorkoutPlan ORDER BY plan_id LIMIT 3
), plan_count AS (
    SELECT COUNT(*)::INT AS total FROM plans
)
INSERT INTO MemberWorkoutPlan (user_id, plan_id, start_date, status)
SELECT users.user_id, plans.plan_id, CURRENT_DATE - (20 + users.user_id % 180),
       (ARRAY['Active','Completed','Abandoned'])[(users.user_id % 3) + 1]
FROM users
CROSS JOIN plan_count count
JOIN plans ON plans.position = 1 + (users.user_id % count.total)
WHERE count.total > 0
  AND users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id, plan_id) DO NOTHING;

WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
), pairs AS (
    SELECT member.user_id, friend.user_id AS friend_id,
           CASE WHEN member.position % 6 = 0 THEN 'Pending' ELSE 'Accepted' END AS status,
           member.position
    FROM ranked member
    JOIN ranked friend ON friend.position = (member.position % 100) + 1
)
INSERT INTO Friendship (user_id, friend_id, status, since_date)
SELECT user_id, friend_id, status, CURRENT_TIMESTAMP - ((position * 4) || ' days')::INTERVAL
FROM pairs ON CONFLICT DO NOTHING;

INSERT INTO MemberProfile (user_id, username, bio, interests, is_private, dm_policy)
SELECT users.user_id, split_part(users.email, '@', 1),
       'Training consistently for ' || LOWER(users.primary_goal) || '.',
       CASE users.primary_goal
           WHEN 'Weight Loss' THEN ARRAY['cardio','nutrition','habits']
           WHEN 'Muscle Gain' THEN ARRAY['hypertrophy','strength','recovery']
           WHEN 'Strength' THEN ARRAY['strength','powerlifting','mobility']
           WHEN 'Flexibility' THEN ARRAY['mobility','yoga','recovery']
           ELSE ARRAY['wellness','fitness','consistency']
       END,
       users.default_privacy = 'Private',
       CASE users.default_privacy WHEN 'Public' THEN 'Everyone' ELSE 'Friends' END
FROM users
WHERE users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username, bio = EXCLUDED.bio, interests = EXCLUDED.interests,
    is_private = EXCLUDED.is_private, dm_policy = EXCLUDED.dm_policy,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO SocialPost (user_id, body, visibility, created_at, updated_at)
SELECT users.user_id, messages.body,
       CASE users.default_privacy WHEN 'Public' THEN 'Public' WHEN 'Friends' THEN 'Friends' ELSE 'Private' END,
       CURRENT_TIMESTAMP - ((7 + users.user_id % 75) || ' days')::INTERVAL,
       CURRENT_TIMESTAMP - ((7 + users.user_id % 75) || ' days')::INTERVAL
FROM users
CROSS JOIN LATERAL (SELECT (ARRAY[
    'Finished a steady workout and kept every rep controlled.',
    'Hit my step goal today. Small choices really add up.',
    'Recovery day: mobility, water, and an early night.',
    'Added a little more volume without sacrificing form.',
    'A short session was better than skipping the day.',
    'Feeling stronger after another consistent week.',
    'Tried a new warm-up and moved much better today.',
    'Progress is slow, measurable, and worth celebrating.'
])[1 + users.user_id % 8] AS body) messages
WHERE users.email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
  AND NOT EXISTS (SELECT 1 FROM SocialPost post WHERE post.user_id=users.user_id AND post.body=messages.body);

WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
)
INSERT INTO FollowRelationship (follower_id, followed_id, status, created_at)
SELECT follower.user_id, followed.user_id, 'Accepted',
       CURRENT_TIMESTAMP - ((follower.position * 2) || ' days')::INTERVAL
FROM ranked follower
JOIN ranked followed ON followed.position IN ((follower.position % 100) + 1, ((follower.position + 6) % 100) + 1)
ON CONFLICT DO NOTHING;

WITH ranked_posts AS (
    SELECT post_id, user_id, ROW_NUMBER() OVER (ORDER BY created_at, post_id) AS position
    FROM SocialPost WHERE user_id IN (
        SELECT user_id FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
    )
), ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
)
INSERT INTO PostLike (post_id, user_id, created_at)
SELECT post.post_id, liker.user_id, CURRENT_TIMESTAMP - ((post.position % 30) || ' days')::INTERVAL
FROM ranked_posts post
JOIN ranked_users liker ON liker.position = (post.position % 100) + 1
WHERE liker.user_id <> post.user_id
ON CONFLICT DO NOTHING;

WITH ranked_posts AS (
    SELECT post_id, user_id, ROW_NUMBER() OVER (ORDER BY created_at, post_id) AS position
    FROM SocialPost WHERE user_id IN (
        SELECT user_id FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
    )
), ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+\.[a-z]+[0-9]{3}@fitkit\.com$'
)
INSERT INTO PostComment (post_id, user_id, body, created_at)
SELECT post.post_id, commenter.user_id, 'Great work - keep the momentum going!',
       CURRENT_TIMESTAMP - ((post.position % 20) || ' days')::INTERVAL
FROM ranked_posts post
JOIN ranked_users commenter ON commenter.position = ((post.position + 10) % 100) + 1
WHERE post.position % 3 = 0 AND commenter.user_id <> post.user_id
  AND NOT EXISTS (
      SELECT 1 FROM PostComment comment
      WHERE comment.post_id=post.post_id AND comment.user_id=commenter.user_id
        AND comment.body='Great work - keep the momentum going!'
  );

