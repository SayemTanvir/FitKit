-- Existing-database-safe seed for 100 varied FitKit demo members.
-- This file is intentionally rerunnable and is applied after platform.sql.

SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1));

-- Rename accounts created by the earlier first.lastNNN convention without
-- changing their IDs or any related history.
WITH email_mapping AS (
    SELECT
        LOWER(first_names[((n - 1) % array_length(first_names, 1)) + 1]
              || '.' || last_names[(((n - 1) / array_length(first_names, 1))::INT % array_length(last_names, 1)) + 1]
              || LPAD(n::TEXT, 3, '0') || '@fitkit.com') AS old_email,
        LOWER(first_names[((n - 1) % array_length(first_names, 1)) + 1]
              || (1 + ((n - 1) / array_length(first_names, 1))::INT)::TEXT
              || '@fitkit.com') AS new_email
    FROM generate_series(1, 100) AS series(n)
    CROSS JOIN (SELECT ARRAY[
        'Aisha','Liam','Sofia','Noah','Maya','Ethan','Priya','Lucas','Hana','Oliver',
        'Nadia','Mateo','Emma','Arif','Chloe','Daniel','Yuki','Amara','Leo','Fatima'
    ]::TEXT[] AS first_names) f
    CROSS JOIN (SELECT ARRAY[
        'Rahman','Carter','Silva','Ahmed','Patel','Kim','Tanaka','Muller','Smith','Khan',
        'Brown','Sato','Wilson','Garcia','Das','Martin','Ali','Johnson','Naidoo','Roy'
    ]::TEXT[] AS last_names) l
)
UPDATE users
SET email = email_mapping.new_email
FROM email_mapping
WHERE LOWER(users.email) = email_mapping.old_email;

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
    LOWER(first_name || (1 + ((n - 1) / 20)::INT)::TEXT || '@fitkit.com'),
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
WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
ON CONFLICT (user_id) DO NOTHING;

WITH demo_users AS (
    SELECT user_id FROM users
    WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
  AND users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
ON CONFLICT (user_id, plan_id) DO NOTHING;

WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
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

WITH ranked_demo_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users
    WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
), demo_pairs AS (
    SELECT first_user.user_id AS first_user_id, second_user.user_id AS second_user_id
    FROM ranked_demo_users first_user
    JOIN ranked_demo_users second_user ON second_user.position = first_user.position + 1
    WHERE first_user.position % 2 = 1
      AND first_user.position < 20
), demo_messages AS (
    SELECT first_user_id AS sender_id, second_user_id AS recipient_id,
        'I kept today''s workout short, but I got it done. What are you training this week?' AS body,
        4 AS days_ago
    FROM demo_pairs
    UNION ALL
    SELECT second_user_id, first_user_id,
        'That counts. I am focusing on consistency and adding a little weight when it feels right.', 3
    FROM demo_pairs
    UNION ALL
    SELECT first_user_id, second_user_id,
        'Good plan. Let me know how the next session goes!', 2
    FROM demo_pairs
    UNION ALL
    SELECT second_user_id, first_user_id,
        'Will do. Hope your next workout goes well too.', 1
    FROM demo_pairs
)
INSERT INTO DirectMessage (sender_id, recipient_id, body, created_at)
SELECT message.sender_id, message.recipient_id, message.body,
    CURRENT_TIMESTAMP - (message.days_ago || ' days')::INTERVAL
FROM demo_messages message
WHERE NOT EXISTS (
    SELECT 1 FROM DirectMessage existing
    WHERE existing.sender_id = message.sender_id
      AND existing.recipient_id = message.recipient_id
      AND existing.body = message.body
);

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
WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username, bio = EXCLUDED.bio, interests = EXCLUDED.interests,
    is_private = EXCLUDED.is_private, dm_policy = EXCLUDED.dm_policy,
    updated_at = CURRENT_TIMESTAMP;

WITH ranked_demo_profiles AS (
        SELECT profile.user_id, profile.photo_url, users.profile_photo_url,
                     ROW_NUMBER() OVER (ORDER BY users.email) AS position
        FROM MemberProfile profile
        JOIN users ON users.user_id = profile.user_id
        WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
)
UPDATE MemberProfile profile
SET photo_url = 'https://i.pravatar.cc/300?img=' || ranked.position::TEXT
FROM ranked_demo_profiles ranked
WHERE profile.user_id = ranked.user_id
    AND ranked.position <= 20
    AND ranked.photo_url IS NULL
    AND ranked.profile_photo_url IS NULL;

UPDATE users
SET profile_photo_url = profile.photo_url
FROM MemberProfile profile
WHERE profile.user_id = users.user_id
    AND users.profile_photo_url IS NULL
    AND profile.photo_url IS NOT NULL
    AND users.email ~ '^[a-z]+[1-5]@fitkit\.com$';

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
WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
  AND NOT EXISTS (SELECT 1 FROM SocialPost post WHERE post.user_id=users.user_id AND post.body=messages.body);

WITH ranked_demo_posts AS (
    SELECT post.post_id,
           ROW_NUMBER() OVER (ORDER BY post.created_at, post.post_id) AS position
    FROM SocialPost post
    JOIN users ON users.user_id = post.user_id
    WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
)
UPDATE SocialPost post
SET image_url = NULL
FROM ranked_demo_posts ranked
WHERE post.post_id = ranked.post_id
    AND ranked.position > 20
    AND post.image_url = ANY(ARRAY[
            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1599058917212-d750089bc07d?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=80'
    ]::TEXT[]);

WITH ranked_demo_posts AS (
        SELECT post.post_id,
                     ROW_NUMBER() OVER (ORDER BY post.created_at, post.post_id) AS position
        FROM SocialPost post
        JOIN users ON users.user_id = post.user_id
        WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
), post_images AS (
    SELECT post_id,
           (ARRAY[
               'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1599058917212-d750089bc07d?auto=format&fit=crop&w=1200&q=80',
               'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=80'
           ])[1 + ((position - 1) % 8)] AS image_url
    FROM ranked_demo_posts
    WHERE position <= 20
)
UPDATE SocialPost post
SET image_url = post_images.image_url
FROM post_images
WHERE post.post_id = post_images.post_id
  AND post.image_url IS NULL;

WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
        SELECT user_id FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
    )
), ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
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
        SELECT user_id FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
    )
), ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY email) AS position
    FROM users WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
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

WITH demo_members AS (
    SELECT user_id
    FROM users
    WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
), post_targets AS (
    SELECT post.post_id, post.user_id AS owner_id,
           1 + ((post.post_id * 7 + 3) % 6) AS fire_count,
           1 + ((post.post_id * 11 + 2) % 7) AS flex_count,
           1 + ((post.post_id * 13 + 1) % 6) AS clap_count
    FROM SocialPost post
    JOIN users ON users.user_id = post.user_id
    WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
), ranked_reactors AS (
    SELECT target.post_id, target.fire_count, target.flex_count, target.clap_count,
           member.user_id,
           ROW_NUMBER() OVER (
               PARTITION BY target.post_id
               ORDER BY MD5(target.post_id::TEXT || ':' || member.user_id::TEXT), member.user_id
           ) AS reactor_position
    FROM post_targets target
    CROSS JOIN demo_members member
    WHERE member.user_id <> target.owner_id
)
INSERT INTO FeedReaction (user_id, post_id, reaction_type)
SELECT reactor.user_id, reactor.post_id,
       CASE
           WHEN reactor.reactor_position <= reactor.fire_count THEN 'Fire'
           WHEN reactor.reactor_position <= reactor.fire_count + reactor.flex_count THEN 'Flex'
           ELSE 'Clap'
       END
FROM ranked_reactors reactor
WHERE reactor.reactor_position <= reactor.fire_count + reactor.flex_count + reactor.clap_count
ON CONFLICT (user_id, post_id) DO NOTHING;

WITH demo_members AS (
    SELECT user_id
    FROM users
    WHERE email ~ '^[a-z]+[1-5]@fitkit\.com$'
), feed_targets AS (
    SELECT feed.feed_id, feed.user_id AS owner_id,
           1 + ((feed.feed_id * 7 + 3) % 6) AS fire_count,
           1 + ((feed.feed_id * 11 + 2) % 7) AS flex_count,
           1 + ((feed.feed_id * 13 + 1) % 6) AS clap_count
    FROM ActivityFeed feed
    JOIN users ON users.user_id = feed.user_id
    WHERE users.email ~ '^[a-z]+[1-5]@fitkit\.com$'
), ranked_reactors AS (
    SELECT target.feed_id, target.fire_count, target.flex_count, target.clap_count,
           member.user_id,
           ROW_NUMBER() OVER (
               PARTITION BY target.feed_id
               ORDER BY MD5(target.feed_id::TEXT || ':' || member.user_id::TEXT), member.user_id
           ) AS reactor_position
    FROM feed_targets target
    CROSS JOIN demo_members member
    WHERE member.user_id <> target.owner_id
)
INSERT INTO FeedReaction (user_id, feed_id, reaction_type)
SELECT reactor.user_id, reactor.feed_id,
       CASE
           WHEN reactor.reactor_position <= reactor.fire_count THEN 'Fire'
           WHEN reactor.reactor_position <= reactor.fire_count + reactor.flex_count THEN 'Flex'
           ELSE 'Clap'
       END
FROM ranked_reactors reactor
WHERE reactor.reactor_position <= reactor.fire_count + reactor.flex_count + reactor.clap_count
ON CONFLICT (user_id, feed_id) DO NOTHING;

